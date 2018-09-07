/*! Copyright (c) 2015 RICOH IMAGING COMPANY, LTD. */

"use strict";

/*--------------------------------------------------------------------------*/
/**
 * 基本情報
 */
(function(){
	$.gr = {
		baseVersion: "1.0.0",
		appName: "UNDEFINED",
		appVersion: "0.0.0",
		lastAppVersion: "0.0.0",

		// 基本情報の登録
		appInfo: function(name, version){
			this.appName = name;
			this.appVersion = version;

			// ローカルストレージのKeyにアプリ名称を付加
			$.grist.localStorage.prefix = $.gr.appName + ":";

			// アプリバージョン保存
			this.lastAppVersion = $.grist.localStorage("lastAppVersion:v1") || this.appVersion;
			$.grist.localStorage("lastAppVersion:v1", this.appVersion);
		}
	};
})();

/**
 * GR制御
 */
(function(){
	$.extend($.gr, {
		getGRDomain: function(){
			return (
				$.grist.opts.grLocation == "default" ? "http://192.168.0.1/" :
				$.grist.opts.grLocation == "same-origin" ? "" :
				$.grist.opts.grLocation == "custom" ? $.grist.opts.grLocationDomain + "/" :
				"http://192.168.0.1/"
			);
		},

		_callAPI: function(func, api, data){
			var splitAPI = api.split("?"),
				apiURI = "v1/" + splitAPI[0],
				apiParams = splitAPI[1];

			if (data != undefined) {
				apiParams = $.extend({}, apiParams, data);
			}

			return $.grist.cam[func](apiURI, apiParams).then(function(data){
				return $.Deferred()[data.errMsg == "OK" ? "resolve" : "reject"](data);
			});
		},

		_delay: function(period){
			return $.Deferred(function(dfd){
				setTimeout(function(){
					dfd.resolve();
				}, period);
			}).promise();
		},

		callAPI: function(api, data){
			return this._callAPI("post", api, data);
		},

		putData: function(api, data){
			return this._callAPI("put", api, data);
		},

		getData: function(api, data){
			return this._callAPI("get", api, data);
		},

		_cmdQueue: $.Deferred().resolve(),
		_asyncPool: [],

		postCommands: function(commands, sync, api){
			var self = this,
				sync = sync || "sync",
				apiURI = api || "_gr",
				callerDfd = $.Deferred();

			// @todo 再帰実行のdfd対応
			(function post(commands){
				var type = $.type(commands),
					cmds = [];

				if (type == "array") {
					$.each(commands, function(i, cmds){
						post(cmds);
					});
					return;
				}

				// @todo &を含むコマンドが送信できないので無効化
				if ($.gr.appName == "GR Remote") {
					if (type == "string") {
						cmds = commands.split("&");
						if (cmds.length > 1) {
							$.each(cmds, function(i, cmds){
								post(cmds);
							});
							return;
						}
					}
				}

				// 非同期コマンドの完了で同期
				if (sync == "sync") {
					self._cmdQueue = self._cmdQueue.then(function(){
						if (self._asyncPool != 0) {
							return $.Deferred(function(dfd){
								$.when.apply($, self._asyncPool).always(function(){
									$.grist.log("cmd: sync");
									dfd.resolve();
								});
								self._asyncPool = [];
							});
						}
					});
				}

				self._cmdQueue = self._cmdQueue.then(function(){
					var dfd = $.Deferred(), promise,
						period, method, api;

					if (commands == "") {
						promise = $.Deferred().resolve().promise();
					} else if (/^delay=(.*)/i.test(commands)) {
						period = RegExp.$1;
						promise = self._delay(period);
					} else if (/^(post|put|get)=(.*)/i.test(commands)) {
						method = RegExp.$1;
						api = RegExp.$2;
						promise = self._callAPI(method, api);
					} else {
						promise = $.grist.cam.post(apiURI, commands).then(function(data){
							return $.Deferred()[data.errMsg == "OK" ? "resolve" : "reject"](data);
						});
					}

					promise.always(function(data){
						dfd.resolve();
						callerDfd[this.state() == "resolved" ? "resolve" : "reject"](data);
					});

					if (sync == "async") {
						self._asyncPool.push(dfd);
					} else {
						return dfd;
					}
				});
			})(commands);

			return callerDfd.promise();
		},

		_dispSize: {
			default: {
				still: { w: 640, h: 424 },
				movie: { w: 640, h: 360 }
			},
			fromAspectRatio: {
				"3:2": { w: 640, h: 424 },
				"4:3": { w: 640, h: 480 },
				"1:1": { w: 480, h: 480 }
			},
			fromSizeID: {
				"F": { w: 640, h: 424 },
				"D": { w: 640, h: 480 },
				"P": { w: 480, h: 480 }
			}
		},

		_defaultDispSize: function(fn){
			return $.gr._dispSize.default[/\.mov$/i.test(fn) ? "movie" : "still"];
		},

		_thumbSize: function(fn){
			return /\.jpg$/i.test(fn) ? { w: 160, h: 120 } : { w: 0, h: 0 };
		},

		getFileList: function(){
			var self = this;

			return $.grist.cam.get("_gr/objs", {}, { dataType: "json" }).then(function(objs){
				var fileList = [];

				if (objs.dirs == undefined) return fileList;

				$.each(objs.dirs, function(i, dir){
					$.each(dir.files, function(i, file){
						var sizeID;

						if (file.o != 0 && file.s != "") {
							sizeID = file.s.charAt(1);

							fileList.push({
								class: "extended",
								fn: dir.name + "/" + file.n,
								orient: file.o || 1,
								size: self._dispSize.fromSizeID[sizeID] || self._defaultDispSize(file.n),
								msize: file.s.charAt(0) != " " ? self._thumbSize(file.n) : { w: 0, h: 0 },
								date: file.d
							});
						} else {
							fileList.push({
								class: "base",
								fn: dir.name + "/" + file.n,
								orient: 1,
								size: self._defaultDispSize(file.n),
								msize: { w: 0, h: 0 },
								date: file.d
							});
						}
					});
				});

				return fileList;
			});
		},

		appendFileInfo: function(file){
			var self = this;

			// @note 他機種画像でもエラーにならないようにする
			return $.Deferred(function(dfd){
				$.grist.cam.get("v1/photos/" + file.fn + "/info")
					.done(function(data){
						file.class = "extended";
						file.orient = data.orientation || 1;
						file.size = self._dispSize.fromAspectRatio[data.aspectRatio] || self._defaultDispSize(file.fn);
						file.msize = self._thumbSize(file.fn);
					})
					.always(function(){
						dfd.resolve();
					});
			});
		},

		getImageURL: function(params){
			var photoParams;

			// JPG以外はthumbをviewで代替
			if (params.size == "thumb" && !/\.jpg$/i.test(params.fn)) {
				params.size = "view";
			}

			// アプリ内部用パラメータ
			photoParams = $.extend({}, params);

			// カメラで不要なパラメータを除外
			delete photoParams.fn;
			delete photoParams.orient;

			return $.grist.cam.src("v1/photos/" + params.fn + "?" + $.param(photoParams) + "#" + $.param(params));
		},

		getDownloadURL: function(params, type){
			var type = type || "page",
				imageURL = $.gr.getImageURL(params).replace(/#.*/, "");

			if (type == "direct") {
				return imageURL;
			}

			// @todo iOS版開発中
			if ($.grist.opts.developMode == "on" && $.grist.platform == "iOS") {
				if (imageURL.indexOf("http:") != 0) imageURL = location.href.replace(/[^\/]*$/, "") + imageURL;
				return grDownloadScheme([imageURL]);
			}

			// iOSは画像保存ページを開く
			if (type == "page" && $.grist.platform == "iOS" && navigator.onLine) {
				return "gr-save.html?" + $.param({ src: imageURL, fn: params.fn });
			}

			return imageURL;
		},

		getImageParams: function(url){
			return $.grist.util.deparam(url);
		},

		getViewURL: function(){
			return (
				$.grist.opts.liveviewAPI == "capture" ? $.grist.cam.src("v1/liveview") :
				$.grist.opts.liveviewAPI == "screen" ? $.grist.cam.src("v1/display") :
				$.grist.opts.liveviewAPI == "none" ? "fallback/liveview.jpg" :
				$.grist.cam.src("v1/liveview")
			);
		}
	});
})();

/**
 * オプション設定管理
 */
$(function(){
	// オプション更新管理
	$(".gr-option")
		.on("change", function(){
			$(this).saveOption();
		})
		.loadOption();

	// フォーム更新管理
	$(".gr-form")
		.each(function(){
			var form = $(this),
				page = $(this).closest("[data-role=page]"),
				panel = $(this).closest("[data-role=panel]");

			page.on("pagebeforeshow", function(){
				if ($.grist.lastClick.hasClass("gr-back")) return;
				form.loadOption();
			});
			panel.on("panelclose", function(){
				form.loadOption();
			});
		})
		.on("submit", function(){
			$(this).saveOption();
		})
		.loadOption();
});

/**
 * プラットフォーム動作改善イベント制御
 */
$(function(){
	// vclick直後のclickを補間
	function InterpolateClickAfterVClick() {
		var CLICK_DELAY = 1000, // @todo 最適化余地あり
			CLICK_CANCEL_PERIOD = 500,
			clickDelay = null,
			vclickCancel = null;

		// vclick直後にアクティブ状態のままでclickが発生しなければ補間
		$(document).on("vclick", "a.ui-btn[href]", function(){
			var vclicked = this;

			if (vclickCancel) return;

			clearTimeout(clickDelay);
			clickDelay = setTimeout(function(){
				clickDelay = null;

				if ($(vclicked).hasClass("ui-btn-active")) {
					$(vclicked).trigger("click");

					// click補完後はしばらくclickを無視
					/* @todo 最適化余地あり
					$(vclicked).on("click.clickCancel", false);
					setTimeout(function(){
						$(vclicked).off("click.clickCancel");
					}, CLICK_CANCEL_PERIOD);
					*/
				}
			}, CLICK_DELAY);
		});

		// vclick後にclickが発生したら補間をキャンセル
		$(document).on("click", "a.ui-btn[href]", function(){
			clearTimeout(clickDelay);
			clickDelay = null;

			// clickトリガーに伴うvclick検出を無効化
			clearTimeout(vclickCancel);
			vclickCancel = setTimeout(function(){
				vclickCancel = null;
			}, 0);
		});
	}

	// スクロール直後のclickを補間
	function InterpolateClickAfterScroll() {
		var SCROLL_END_DELAY = 300,
			CLICK_DELAY = 300,
			scrollEnding = null,
			clickDelay = null,
			vclickCancel = null;

		// スクロール直後期間監視
		$(document).on("scroll", function(){
			clearTimeout(scrollEnding);
			scrollEnding = setTimeout(function(){
				scrollEnding = null;
			}, SCROLL_END_DELAY);
		});

		// スクロール直後期間にvclick後のclickが発生しなければ補間
		$(document).on("vclick", "a[href]", function(){
			var vclicked = this;

			if (vclickCancel) return;

			// vclick発生後にclickを補間
			clearTimeout(clickDelay);
			clickDelay = setTimeout(function(){
				clickDelay = null;

				if (scrollEnding) {
					$(vclicked).trigger("click");
				}
			}, CLICK_DELAY);
		});

		// vclick後にclickが発生したら補間をキャンセル
		$(document).on("click", "a[href]", function(){
			clearTimeout(clickDelay);
			clickDelay = null;

			// clickトリガーに伴うvclick検出を無効化
			clearTimeout(vclickCancel);
			vclickCancel = setTimeout(function(){
				vclickCancel = null;
			}, 0);
		});
	}

	// @note PCブラウザにおいてDrag後のTapholdを抑制
	$(document).on("mousedown", function(e){
		var orgX = e.pageX, orgY = e.pageY;

		$(document)
			.on("mousemove.cancelTaphold", function(e){
				if (e.pageX != orgX || e.pageY != orgY) {
					$(document).trigger("vmousecancel");
					$(document).off("mousemove.cancelTaphold mouseup.cancelTaphold");
				}
			})
			.one("mouseup.cancelTaphold", function(){
				$(document).off("mousemove.cancelTaphold");
			});
	});

	// @note Android taphold時のポップアップメニュー抑制
	if ($.grist.platform == "Android") {
		(function(){
			var CONTEXT_MENU_ENABLE_PERIOD = 3 * 1000,
				timeout = null;

			$(document).on("contextmenu.downloadEnable", false);

			// 画像ダウンロードリンクのみポップアップメニュー許可
			$(document).on("vmousedown", "a[download]", function(){
				$(document).off("contextmenu.downloadEnable");
				clearTimeout(timeout);
				timeout = setTimeout(function(){
					timeout = null;
					$(document).on("contextmenu.downloadEnable", false);
				}, CONTEXT_MENU_ENABLE_PERIOD);
			});
		})();
	}

	// @todo iOS/Android リンクタップ無視を対策
	InterpolateClickAfterVClick()
	if ($.grist.platform == "iOS") {
		InterpolateClickAfterScroll()
	}

	// iOS/Android パネルオープン時にポップアップが残る現象を対処
	$(document).on("panelbeforeopen", function(){
		$(".ui-popup-active .ui-popup").popup("close");
	});

	// @todo ポップアップ移動対策
	$.widget("mobile.popup", $.extend({}, $.mobile.popup.prototype, {
		_handleWindowResize: function(){
			if (this._isOpen) {
				// モバイル環境はスクロールでresizeが発生するのでcloseしない
				if (!/Android|iOS/.test($.grist.platform)) {
					this.close();
				}
			}
		},
		_handleWindowOrientationchange: function(){
			if (this._isOpen) {
				this.close();
			}
		}
	}));

	// フッタちらつき抑制
	$(document)
		.on("pagecreate", function(e){
			var page = $(e.target);

			page.css("min-height", $.mobile.getScreenHeight());
		})
		.on("pagebeforeshow pagebeforehide", function(e){
			var page = $(e.target),
				pageHeight = page.outerHeight(),
				screenHeight = $.mobile.getScreenHeight(),
				minHeight = pageHeight > screenHeight ? pageHeight : screenHeight;

			page.find(".ui-footer").parent().css("min-height", minHeight);
		})
		.on("pageshow pagehide", function(e){
			var page = $(e.target);

			page.find(".ui-footer").parent().css("min-height", "");
		});
});

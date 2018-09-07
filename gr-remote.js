/*! Copyright (c) 2015 RICOH IMAGING COMPANY, LTD. */

"use strict";

/*--------------------------------------------------------------------------*/
/**
 * デバッグ用オプション
 */
(function(){
//	$.grist.args.debugMode = "on";
//	$.grist.args.developMode = "on";
})();

/**
 * 基本情報
 */
(function(){
	$.gr.appInfo("GR Remote", "1.2.1");
})();

/**
 * 互換対応
 */
(function(){
	// ローカルストレージの保守
	if ($.gr.lastAppVersion < "1.2.0") {
		(function(){
			function attachPrefix(name) {
				var orgPrefix = $.grist.localStorage.prefix,
					opt;

				$.grist.localStorage.prefix = "";
				opt = $.grist.localStorage(name);
				$.grist.localStorage(name, null);
				$.grist.localStorage.prefix = orgPrefix;

				if (opt != null) $.grist.localStorage(name, opt);
			}

			attachPrefix("lastAppVersion:v1", null);
			attachPrefix("options.dlMethod");
			attachPrefix("options.dlSize");
			attachPrefix("options.lvTouch");
			attachPrefix("options.viewDNG");
			attachPrefix("options.viewJPG");
			attachPrefix("options.viewMOV");
			attachPrefix("fileCache:v1");
			attachPrefix("fileCache:v1.length");
		})();
	}
})();

/*--------------------------------------------------------------------------*/
/**
 * ファイル情報の管理
 */
(function(){
	var FILE_CACHE_LIMIT = 10000,
		MAX_ITEMS_IN_PAGE = 100;

	$.extend($.gr, {
		// カメラファイル一覧
		_fileCache: $.grist.Cache("fileCache:v1", FILE_CACHE_LIMIT),
		_fileList: [],
		fileListLoaded: false,

		// ビューア画像一覧
		viewerFileFilter: ["jpg", "dng", "mov"],
		viewerFileList: [],
		viewerFileSort: { folder: {}, date: {} },

		// ビューアページ
		activeViewerPage: "100RICOH[0]",
		viewerPages: [],
		viewerPageFiles: {},
		_folderNames: {
			today: "Today's Shots"
		},

		// ページ番号からページ名取得
		getViewerPageTitle: function(viewerPage){
			var title, folder, nth, count;

			if (!/(.*)\[(.*)\]/.test(viewerPage)) return "";

			folder = RegExp.$1;
			nth = parseInt(RegExp.$2) + 1;
			count = 1;

			$.each(this.viewerFileSort, function(){
				if (this[folder] != undefined) {
					count = Math.ceil(this[folder].length / MAX_ITEMS_IN_PAGE);
					return false;
				}
			});

			title = this._folderNames[folder] || folder;
			if (count > 1) {
				title += " (" + nth + "/" + count + ")";
			}

			return title;
		},

		// ビューア画像一覧作成
		_buildViewerFileList: function(){
			var self = this,
				fileList = $.extend(true, [], self._fileList),
				pid = 0;

			// ファイル一覧のソート
			fileList.sort(function(a, b){
				return a.fn < b.fn ? -1 : 1;
			});

			// ビューア全画像一覧作成
			this.viewerFileList = $.map(fileList, function(file){
				var ext = file.fn.replace(/.*\./, "").toLowerCase();

				if ($.inArray(ext, self.viewerFileFilter) == -1) return null;

				file = $.extend({}, file)
				file.pid = pid++;
				file.date = $.grist.util.fromLocalISOTime(file.date);

				return file;
			});

			// フォルダ別画像一覧作成
			this.viewerFileSort.folder = (function(fileList){
				var sortedList = {};

				$.each(fileList, function(i, file){
					var dir = file.fn.split("/").slice(-2)[0];

					if (dir != "") {
						sortedList[dir] = sortedList[dir] || [];
						sortedList[dir].push(file);
					}
				});

				return sortedList;
			})(this.viewerFileList);

			// 日付別画像一覧作成
			this.viewerFileSort.date = (function(fileList){
				var sortedList = { today: [] },
					today = new Date();

				$.each(fileList, function(i, file){
					if (file.date.toDateString() == today.toDateString()) {
						sortedList["today"].push(file);
					}
				});

				return sortedList;
			})(this.viewerFileList);
		},

		// ビューアページ作成
		_buildViewerPages: function(){
			var self = this;

			this.viewerPages = [];
			this.viewerPageFiles = {};

			// 規定枚数ごとにフォルダ分割
			$.map(["date", "folder"], function(order){
				$.each(self.viewerFileSort[order], function(dir, files){
					var numPages = Math.ceil(files.length / MAX_ITEMS_IN_PAGE),
						i;

					// 日付フォルダに該当ファイルがない場合を考慮
					if (numPages == 0) numPages = 1;

					for (i = 0; i < numPages; i++) {
						var viewerPage = dir + "[" + i + "]";

						self.viewerPages.push(viewerPage);
						self.viewerPageFiles[viewerPage] = files.slice(i * MAX_ITEMS_IN_PAGE, (i + 1) * MAX_ITEMS_IN_PAGE);
					}
				});
			});
		},

		// ファイル一覧のクリア
		clearFileList: function(){
			var self = this;

			self.viewerFileList = [];
			$.each(self.viewerFileSort, function(order){
				self.viewerFileSort[order] = {};
			});
			this.viewerPages = [];
			this.viewerPageFiles = {};

			this.fileListLoaded = false;
		},

		// ファイル一覧の更新
		refreshFileList: function(){
			var self = this,
				cacheActive = $.grist.cam.state() == "online";

			// キャッシュ済みファイル情報の読み込み
			if (cacheActive) {
				this._fileCache.load();
			}

			return $.Deferred().resolve()
				.then(function(){
					return $.gr.getFileList();
				})
				.then(function(fileList){
					return $.Deferred(function(dfd){
						var promises = [];

						$.each(fileList, function(i, file){
							var cache;

							if (file.class == "extended") {
								if (cacheActive) {
									self._fileCache.put([file.fn, file.date], file);
								}
								return;
							}

							if (cacheActive) {
								cache = self._fileCache.get([file.fn, file.date]);
								if (cache != undefined) {
									fileList[i] = cache;
									return;
								}
							}

							promises.push($.gr.appendFileInfo(file).done(function(){
								if (cacheActive) {
									self._fileCache.put([file.fn, file.date], file);
								}
							}));
						});

						$.when.apply($, promises)
							.done(function(){
								dfd.resolve(fileList);
							})
							.fail(function(){
								dfd.reject();
							});
					});
				})
				.then(function(fileList){
					var modified = JSON.stringify(fileList) != JSON.stringify(self._fileList);

					$.grist.log("list: modified=" + modified);

					if (modified) {
						self._fileList = $.extend(true, [], fileList);
						if (cacheActive) {
							self._fileCache.save();
						}

						// @todo localDebug時に問題になる
						// self._buildViewerFileList();
					}
					self._buildViewerFileList();
					self._buildViewerPages();

					if (!self.fileListLoaded) {
						self.fileListLoaded = true;
						modified = true;
					}

					return modified;
				})
				.fail(function(){
					self.clearFileList();
				});
		}
	});
})();

/**
 * 画像ダウンロードリンクの管理
 */
(function(){
	$.extend($.gr, {
		activeDlSize: "view"
	});

	$.fn.extend({
		grDownload: function(state){
			var dlType = $.grist.opts.galleryAction == "select" ? "direct" : "page",
				dlAttr = $.grist.opts.dlMethod == "direct" ? "" : null;

			this.each(function(){
				var orgHref = $(this).data("orgHref.download") || $(this).attr("href"),
					newHref, fn;

				if (state == "on") {
					fn = $.gr.getImageParams(orgHref).fn,
					newHref = $.gr.getDownloadURL({ fn: fn, size: $.gr.activeDlSize }, dlType);

					$(this)
						.addClass("gr-download")
						.attr({ href: newHref, target: "_blank", download: dlAttr })
						.data("orgHref.download", orgHref);
				} else {
					$(this)
						.removeClass("gr-download")
						.attr({ href: orgHref, target: null, download: null })
						.removeData("orgHref.download");
				}
			});

			return this;
		}
	});
})();

/**
 * カメラ情報の管理
 */
(function(){
	$.extend($.gr, {
		_defaultInfo: {
			model: "Unknown",
			version: 0.00
		},
		_info: null,

		getGRInfo: function(){
			return $.grist.opts.grSysInfo == "manual" ? {
					model: $.grist.opts.grModel,
					version: $.grist.opts.grVersion
				} : this._info || this._defaultInfo;
		},

		clearGRInfo: function(){
			this._info = this._defaultInfo;
		},

		refreshGRInfo: function(){
			var self = this;

			this.clearGRInfo();

			return $.gr.getData("constants/device").done(function(data){
				self._info = { model: data.model, version: Number(data.firmwareVersion) };
			})
		}
	});
})();

/**
 * アプリ動作モードの管理
 */
(function(){
	$.extend($.gr, {
		refreshSettings: function(){
			var standalone, landscape, mini,
				grInfo, restrictWiFiChannel;

			$.gr.viewerFileFilter = $.map(["viewJPG", "viewDNG", "viewMOV"], function(ext){
				return $.grist.opts[ext] || null;
			});

			$.grist.debugMode = $.grist.opts.debugMode == "on";
			$.grist.simulationEnabled = $.grist.opts.apiSimulation == "on";

			standalone = navigator.standalone || $.grist.opts.standaloneMode == "on";
			$("body")[standalone ? "addClass" : "removeClass"]("gr-state-standalone");

			// 横向きレイアウト判定（画面幅が480pxより小さい場合のみ有効）
			landscape =
				Math.abs(window.orientation) == 90 && screen.width < 480 ||
				$.grist.opts.landscapeLayout == "on";
			$("body")[landscape ? "addClass" : "removeClass"]("gr-landscape");

			// miniモード判定
			mini = $("html").hasClass("gr-remote-mini") || $.grist.opts.miniMode == "on";
			$("body")[mini ? "addClass" : "removeClass"]("gr-state-mini");

			$("body")[$.grist.opts.developMode == "on" ? "addClass" : "removeClass"]("gr-state-develop");

			grInfo = $.gr.getGRInfo();
			restrictWiFiChannel = grInfo.model == "GR II" && grInfo.version < 1.10;
			$("body")[restrictWiFiChannel ? "addClass" : "removeClass"]("gr-state-restrict-wifi");
		}
	});
})();

/*--------------------------------------------------------------------------*/
/**
 * JQM初期設定
 */
$(document).on("mobileinit", function(){
	$.mobile.defaultPageTransition = "fade";

	$.mobile.getMaxScrollForTransition = function(){
		return $.mobile.getScreenHeight() * 4;
	};

	// @note メニューによる同一ページ遷移を対策
	$.mobile.changePage.defaults.allowSamePageTransition = true;

	// @note iOS9スタンドアローン時のBack不具合を対策
	if ($.grist.platform == "iOS" && navigator.standalone) {
		$.mobile.hashListeningEnabled = false;
	}
});

/*--------------------------------------------------------------------------*/
/**
 * オプション初期設定
 */
(function(){
	$.grist.cam.fallback.randomViewFile = "scenes.json";
	$.grist.m.loading.options = { theme: "a" };
	$.grist.m.appCache.options = { showLoading: true };
})();

/**
 * DOM初期設定
 */
$(function(){
	$.gr.activeViewerPage = $.grist.localStorage("lastGalleryPage:v1") || "today[0]";

	// iOSのスタンドアローンの場合、最終ページへ遷移
	(function(){
		var startPage = $.grist.localStorage("lastPage:v1");

		$.grist.localStorage("lastPage:v1", null);

		if (startPage != null && location.hash == "") {
			if ($.grist.platform == "iOS" && navigator.standalone) {
				// @note iOS9スタンドアローン時のBack不具合を対策
				$.mobile.hashListeningEnabled = true;
				location.hash = "#" + startPage;
				setTimeout(function(){
					$.mobile.hashListeningEnabled = false;
				});

				// @todo 2回ページ遷移が発生してちらつく現象を対策
				$.mobile.changePage.defaults.allowSamePageTransition = false;
				$(document).one("vmousedown.hashChange", function(){
					$.mobile.changePage.defaults.allowSamePageTransition = true;
				});
				setTimeout(function(){
					$.mobile.changePage.defaults.allowSamePageTransition = true;
					$(document).off("vmousedown.hashChange");
				}, 3000);
			}
		}
	})();

	// 画像ギャラリーページから開始する場合、画像ビューアページを履歴に挿入
	if (location.hash == "#gr-viewer-gallery") {
		history.replaceState(null, null, "#gr-viewer");
		document.title = "Viewer";
		history.pushState(null, null, "#gr-viewer-gallery");
	}

	// 共通ポップアップ・共通パネル初期化
	$("body > [data-role=popup]").enhanceWithin().popup();
	$("body > [data-role=panel]").enhanceWithin().panel();

	// iOSの場合、画像回転はExifに任せる
	if ($.grist.platform == "iOS") {
		$("body").addClass("gr-rotate-by-exif");
	}

	// 動作モード設定
	$.gr.refreshSettings();

	// miniモード設定
	if ($("body").hasClass("gr-state-mini")) {
		// @todo 固定ツールバー対応
		// $("[data-role=header]").attr("data-position", "fixed");

		// コマンダーページ、プリセットページを削除
		$("#gr-home, #gr-presets").remove();

		// ビューアページをホームページとする
		$.gr.appName += " Custom";
		$("#gr-viewer").attr("data-title", $.gr.appName);

		// UIテーマのデフォルトをLightとする
		$.grist.opts.uiTheme = $.grist.localStorage("options.uiTheme") ? $.grist.opts.uiTheme : "a";
		$("select[name=uiTheme]").val($.grist.opts.uiTheme);
	}

	// アプリバージョン設定
	$(".gr-app-version").text($.gr.appVersion);

	// AppCache有効時にタイトル変更
	if ($("html").attr("manifest") != undefined) {
		$(":jqmData(title='" + $.gr.appName + "')").jqmData("title", $.gr.appName + " (AppCache)");
	}

	// UIテーマ設定
	$(".gr-theme").each(function(){
		if ($(this).hasClass("ui-bar")) {
			$(this).addClass("ui-bar-" + $.grist.opts.uiTheme);
		} else if ($(this).hasClass("ui-body")) {
			$(this).addClass("ui-body-" + $.grist.opts.uiTheme);
		} else {
			$(this).attr("data-theme", $.grist.opts.uiTheme);
		}
	});

	// @todo 起動直後ページ表示のちらつきを抑制
	$("body > [data-role=page]").find("[role=main], [data-role=header], [data-role=footer]").css("visibility", "hidden");
	$(document).one("pageshow", function(){
		setTimeout(function(){
			$("body > [data-role=page]").find("[role=main], [data-role=header], [data-role=footer]").css("visibility", "");
		}, 10);
	});
});

/**
 * ページ初期設定
 */
$(document).on("pagecreate enhance", function(e){
	var page = $(e.target);

	// Lightテーマの場合、黒アイコンを使用
	if (page.is(".ui-page-theme-a")) {
		page
			.find(".ui-btn")
			.filter(".ui-btn-icon-left, .ui-btn-icon-right, .ui-btn-icon-top, .ui-btn-icon-bottom, .ui-btn-icon-notext")
			.filter(":not(.ui-checkbox-off):not(.ui-checkbox-on):not(.ui-radio-on):not(.ui-radio-off)")
			.addClass("ui-alt-icon");
	}
	page.find(".ui-bar-a").each(function(){
		$(this)
			.find(".ui-btn")
			.filter(".ui-btn-icon-left, .ui-btn-icon-right, .ui-btn-icon-top, .ui-btn-icon-bottom, .ui-btn-icon-notext")
			.filter(":not(.ui-checkbox-off):not(.ui-checkbox-on):not(.ui-radio-on):not(.ui-radio-off)")
			.addClass("ui-alt-icon");
	});
	page.find(".ui-bar-b").each(function(){
		$(this)
			.find(".ui-btn")
			.filter(".ui-btn-icon-left, .ui-btn-icon-right, .ui-btn-icon-top, .ui-btn-icon-bottom, .ui-btn-icon-notext")
			.filter(":not(.ui-checkbox-off):not(.ui-checkbox-on):not(.ui-radio-on):not(.ui-radio-off)")
			.removeClass("ui-alt-icon");
	});

	// アクティブ状態なしのフリップスイッチ
	page.find("select.gr-slider-no-active").each(function(){
		$(this).next(".ui-slider").find(".ui-btn-active").removeClass("ui-btn-active");
	});
});

/**
 * 共通イベント制御
 */
$(function(){
	// 画面回転
	$(window).on("orientationchange", function(){
		$.gr.refreshSettings();
	});
});

/**
 * 拡張ウィジェット
 */
$(function(){
	// トグルボタン
	$(".gr-toggle-btn")
		.on("vclick", function(){
			var value = $(this).val() || false;

			$(this).val(!value).trigger("change");
		})
		.on("change", function(){
			$(this).trigger("refresh");
		})
		.on("refresh", function(){
			$(this)[$(this).val() ? "addClass" : "removeClass"]("ui-btn-active");
		});
});

/*--------------------------------------------------------------------------*/
/**
 * 全ページ共通
 */
$(document).one("pagecreate", function(){
	// 未実装通知
	$(document).on("click change", ".gr-uc", function(){
		$.grist.m.notify("UNDER CONSTRUCTION");
	});

	// 最終ページ保存
	$(document).on("pagecontainerchange", function(e, data){
		var lastPage = data.toPage.attr("id");

		$.grist.localStorage("lastPage:v1", lastPage);
	});

	// ビューアページ変更
	$(document).on("click", "a[fd]", function(){
		$.gr.activeViewerPage = $(this).attr("fd");
		$.grist.localStorage("lastGalleryPage:v1", $.gr.activeViewerPage);

		if ($(this).attr("href") == "#") {
			$("body").pagecontainer("getActivePage").trigger("viewerpagechange");
		}
	});

	// ページ先頭／終端へ移動
	$(document).on("click", "a.gr-to-top", function(){
		$.grist.m.scroll(0, "animate");
	});
	$(document).on("click", "a.gr-to-bottom", function(){
		$.grist.m.scroll($(this).closest(".ui-page").height(), "animate");
	});

	// @note iOS9スタンドアローン時のBack不具合を対策
	if ($.grist.platform == "iOS" && navigator.standalone) {
		$("a[data-rel=back]:not([href=#])").on("click", function(){
			var self = this;

			$(this).attr("data-rel", "");
			setTimeout(function(){
				$(self).attr("data-rel", "back");
			}, 0);
		});
	}

	// 自動デモ開始判断
	if ($.grist.args.demo == "on") {
		$(document).one("pageshow", function(){
			var POPUP_OPEN_DELAY = 500;

			setTimeout(function(){
				$("#gr-demo").trigger("click");
			}, POPUP_OPEN_DELAY);
		});
	}
});

/**
 * カメラ接続
 */
$(document).one("pagecreate", function(){
	var SCAN_TIMEOUT = 5 * 1000,
		PING_INTERVAL = 10 * 1000,
		SCAN_DELAY_ON_STARTUP = 1 * 1000;

	// カメラ接続
	$(document).on("connect", function(){
		var promises = [];

		$.grist.cam.activeDomains = $.grist.scanner.foundDomains;
		$.gr.clearFileList();

		$(".gr-power .fa").addClass("gr-active");

		// カメラ情報の取得
		promises.push($.gr.refreshGRInfo());

		// レンズロック状態の取得
		promises.push(
			$.gr.postCommands("mpget=LENS_LOCK AF_LEVER").done(function(data){
				$("#gr-lenslock").val(data["LENS_LOCK"] == 1 ? "Lock" : "Off").trigger("change").slider().slider("refresh");
				$("#gr-aflever").val(data["AF_LEVER"] == 1 ? "C-AF" : "AFL").trigger("refresh").slider().slider("refresh");
			})
		);

		$.when.apply($, promises).always(function(){
			$.gr.refreshSettings();
			$("body").pagecontainer("getActivePage").trigger("pagerefresh");
		});

		// 切断検出開始
		$(document).trigger("ping");
		/* @todo WebSocket版
		if ($.grist.opts.disablePing == "on") return;

		$.grist.scanner.keep()
			.done(function(){
				if ($.grist.cam.state() == "online") {
					$.grist.m.notify("DISCONNECTED");
					$(document).trigger("disconnect");
				}
			})
			.fail(function(){
				// @todo WebSocketエラー
				$.grist.alert("WebSocket Error");
			});
		*/
	});

	// カメラ切断
	$(document).on("disconnect", function(){
		$.grist.cam.activeDomains = [];
		$.gr.clearFileList();
		$.gr.clearGRInfo();
		$.gr.refreshSettings();
		$("body").pagecontainer("getActivePage").trigger("pagerefresh");
		$(".gr-power .fa").removeClass("gr-active");
	});

	// 接続検出
	$(document).on("scan", function(e, timeout){
		$.grist.cam.activeDomains = [];

		$.grist.scanner.scanDomains = [$.gr.getGRDomain()];
		$.grist.scanner.find(timeout)
			.done(function(){
				$.grist.m.notify("CONNECTED TO GR");
				$(document).trigger("connect");
			})
			.fail(function(reason){
				if (timeout != undefined && reason == "timeout") {
					$.grist.m.notify("NOT CONNECTED");
				}
			});
	});

	// 切断検出
	$(document).on("ping", function(){
		(function ping(){
			if ($.grist.opts.disablePing == "on") return;
			if ($.grist.cam.state() == "offline") return;

			// @todo PhotoSwipe表示中対応
			//if ($.active + $.grist.grLoadImage.active > 0 || $(".pswp").hasClass("pswp--open")) {

			// 画像ロード中は切断検出無効
			if ($.active + $.grist.grLoadImage.active > 0) {
				setTimeout(ping, PING_INTERVAL);
				return;
			}

			$.grist.scanner.ping()
				.done(function(){
					setTimeout(ping, PING_INTERVAL);
				})
				.fail(function(){
					if ($.grist.opts.disablePing == "on") return;
					if ($.grist.cam.state() == "offline") return;

					$.grist.m.notify("DISCONNECTED");
					$(document).trigger("disconnect");
				});
		})();
	});

	// 電源OFF
	$(document).on("vclick", ".gr-power", function(){
		if ($.grist.cam.state() == "offline") return;

		setTimeout(function(){
			$.grist.m.notify("See you!").always(function(){
				$(document).trigger("disconnect");
			});
		}, 600); // @todo 切断検知が先に処理される場合あり
	});

	// 再接続
	$(document).on("vclick", ".gr-refresh", function(){
		$.grist.cam.activeDomains = [];
		$("#gr-icon-power").removeClass("gr-active");
		$.grist.m.loading("show", "Connecting");
		$(document).trigger("scan", SCAN_TIMEOUT);
	});

	// 自動接続
	setTimeout(function(){
		$(document).trigger("scan");
	}, SCAN_DELAY_ON_STARTUP);
});

/**
 * ファイル一覧取得
 */
$(document).one("pagecreate", function(){
	var dfd = null;

	// ファイル一覧取得
	$(document).on("list", function(){
		if (dfd && dfd.state() == "pending") return;

		dfd = $.grist.m.busy(function(){
			return $.gr.refreshFileList().always(function(modified){
				var activePanel = $(".ui-panel-open"),
					activePage = $("body").pagecontainer("getActivePage"),
					eventTarget = activePanel.length > 0 ? activePanel : activePage;

				eventTarget.trigger("listload",
					this.state() == "rejected" ? "error" :
					modified ? "modified" : undefined
				);
			})
		});
	})
});

/**
 * リモートコントロール
 */
$(document).one("pagecreate", function(){
	var REPEAT_INTERVAL = 500,
		repeatTimer = null;

	// @note vclick重複の対策
	$(document).on("vclick", "a:jqmData(gr):not([href]):not(:jqmData(rel))", function(e){
		e.preventDefault();
	});

	// ボタン
	$(document).on("vclick", "a:jqmData(gr)", function(){
		var command = $(this).jqmData("gr");

		if (command == "") return;
		if (repeatTimer != null) return;

		if ($(this).hasClass("gr-key")) {
			$.gr.postCommands(command);
		} else {
			$.grist.m.busy(function(){
				return $.gr.postCommands(command);
			});
		}
	})

	// トグルボタン
	$(document).on("change", "a:jqmData(gr-on), a:jqmData(gr-off)", function(){
		var command = $(this).jqmData($(this).val() ? "gr-on" : "gr-off");

		if (command == "") return;

		$.grist.m.busy(function(){
			return $.gr.postCommands(command);
		});
	});

	// キーリピート
	$(document).on("taphold", "a:jqmData(gr).gr-key", function(){
		var repeat = $(this).hasClass("gr-key-dial") ? " 2" : " 1 0 1 0",
			command = $(this).jqmData("gr") + repeat;

		$(document).one("vmouseup", function(){
			clearInterval(repeatTimer);
			repeatTimer = null;
		});

		$.gr.postCommands(command);
		repeatTimer = setInterval(function(){
			$.gr.postCommands(command);
		}, REPEAT_INTERVAL);
	});

	// セレクトメニュー
	$(document).on("change refresh", "select.gr-select", function(e){
		var command = $(this).find("option:selected").jqmData("gr");

		if (command != undefined) {
			if (e.type == "refresh") {
				$.gr.postCommands(command);
			} else {
				$.grist.m.busy(function(){
					return $.gr.postCommands(command);
				});
			}
		}

		$(this).find("option.gr-option-title").remove();
	})
});

/**
 * 画像ギャラリー
 */
$(document).one("pagecreate", function(){
	var linkClicked = false;

	$(".gr-gallery").each(function(i){
		$(this).attr("data-pswp-uid", i + 1).addClass("gr-gallery-photoswipe");
	});

	$(document).on("click", ".gr-gallery.gr-gallery-photoswipe a", function(e){
		var gallery = $(this).closest(".gr-gallery"),
			photoSwipe,
			options,
			items = [];

		// DOMツリーから画像情報を補填
		gallery.find("a").each(function(){
			var index = $(this).data("gr-pid"),
				file = $.gr.viewerFileList[index],
				image;

			if (file == undefined) return;

			// MOVのサイズ取得
			if (/\.mov$/i.test(file.fn)) {
				image = $(this).find("img")[0];
				if (image.naturalWidth != 0 && image.naturalHeight != 0) {
					file.size.w = image.naturalWidth;
					file.size.h = image.naturalHeight;
				}
			}
		});

		// 画像情報作成
		items = $.gr.viewerFileList.map(function(file){
			var item = {
				src: $.gr.getImageURL({ fn: file.fn, size: "view", orient: file.orient }),
				w: file.orient < 5 ? file.size.w : file.size.h,
				h: file.orient < 5 ? file.size.h : file.size.w,
				msrc: $.gr.getImageURL({ fn: file.fn, size: "thumb", orient: file.orient }),
				title: $.grist.uri.filename(file.fn)
			};

			// PhotoSwipe GR拡張: サムネールの位置とサイズを補正
			if (file.msize.w == 160 && file.msize.h == 120) {
				if (file.size.w * 3 > file.size.h * 4) {
					item.mwidth = file.size.w;
					item.mheight = file.size.w * 3 / 4;
				} else {
					item.mwidth = file.size.h * 4 / 3;
					item.mheight = file.size.h;
				}
				item[file.orient < 5 ? "mleft" : "mtop"] = (file.size.w - item.mwidth) / 2;
				item[file.orient < 5 ? "mtop" : "mleft"] = (file.size.h - item.mheight) / 2;
			}

			// デバッグ用
			item.title += $.grist.comment(" " + JSON.stringify({
				w: file.size.w, h: file.size.h,
				mw: file.msize.w, mh: file.msize.h,
				o: file.orient
			}).replace(/\"/g, ""));

			return item;
		});

		// PhotoSwipe起動オプション
		options = {
			showHideOpacity: true,
			history: false,
			index: $(this).data("gr-pid"),
			galleryUID: gallery.data("pswp-uid"),
			getThumbBoundsFn: function(index){
				var thumbnail, rect, pageYScroll;

				thumbnail =
					gallery.find("a[data-gr-pid=" + index + "] img")[0] ||
					gallery.find("a:first img")[0];

				if (thumbnail == undefined) return;

				rect = thumbnail.getBoundingClientRect();
				pageYScroll = window.pageYOffset || document.documentElement.scrollTop;

				return { x: rect.left, y: rect.top + pageYScroll, w: rect.width };
			},

			shareButtons: [
				{ id: "vga", label: "Download VGA", url: "{{raw_image_url}}", size: "view" },
				{ id: "original", label: "Download Original", url: "{{raw_image_url}}", size: "full" }
			],
			getImageURLForShare: function(shareButtonData){
				var fn = $.gr.getImageParams(photoSwipe.currItem.src).fn;

				shareButtonData.download = $.grist.opts.dlMethod == "direct";

				return $.gr.getDownloadURL({ fn: fn, size: shareButtonData.size });
			},

			noShareModal: $.grist.opts.dlSize != "select"
		};

		photoSwipe = new PhotoSwipe($(".pswp")[0], PhotoSwipeUI_Default, items, options);

		// ダウンロード対応
		(function(){
			var shareLink = $("a.pswp__button--share"), shareModal = $(".pswp__share-modal");

			shareLink.on("pswpTap", function(){
				linkClicked = true;
			});
			shareModal.on("pswpTap", "a", function(){
				linkClicked = true;
			});

			photoSwipe.listen("destroy", function(){
				shareLink.off("pswpTap");
				shareModal.off("pswpTap");
				$(".pswp a[download]").removeAttr("download");
			});

			photoSwipe.listen("beforeChange", function(){
				var fn = $.gr.getImageParams(photoSwipe.currItem.src).fn,
					size = $.grist.opts.dlSize == "vga" ? "view" : "full";

				shareLink.attr({
					href: $.gr.getDownloadURL({ fn: fn, size: size }),
					target: "_blank",
					download: $.grist.opts.dlMethod == "direct" ? "" : null
				});

				shareModal.find("a[download]").removeAttr("download");
			});

			$("button.pswp__button--share")[$.grist.opts.dlSize == "select" ? "show" : "hide"]();
			$("a.pswp__button--share")[$.grist.opts.dlSize != "select" ? "show" : "hide"]();
		})();

		// ハッシュ変更
		(function(){
			var originalHash,
				closeByBack = false;

			photoSwipe.listen("destroy", function(){
				if (!closeByBack && $.grist.platform != "iOS") { // @todo iOSはBackでスクロールしてしまうので無効化
					history.back();
				} else {
					$(window).off("beforenavigate.photoSwipe");
				}
			});
			originalHash = $.mobile.navigate.history.getActive().hash;
			if ($.grist.platform != "iOS") { // @todo iOSはBackでスクロールしてしまうので無効化
				if (location.hash.indexOf($.mobile.dialogHashKey) == -1) { // @todo dialogHashKey重複を対策
					location.hash += $.mobile.dialogHashKey;
				}
			}
			setTimeout(function(){
				$(window).one("beforenavigate.photoSwipe", function(){
					closeByBack = true;
					photoSwipe.close();
					return $.mobile.navigate.history.getActive().hash != originalHash;
				});
			}, 0);
		})();

		// PhotoSwipe起動
		photoSwipe.init();

		return e.preventDefault();
	});

	// Shareボタンの置き換え
	$("button.pswp__button--share").replaceWith(
		'<button class="pswp__button pswp__button--share" title="Download"></button>' +
		'<a class="pswp__button pswp__button--share" title="Download" style="display: none;"></a>'
	);

	// リンククリック後はコントロールのトグルをスキップ
	$(".pswp__scroll-wrap").on("pswpTap", function(e){
		if (linkClicked) {
			linkClicked = false;
			e.stopImmediatePropagation();
		}
	});

	// taphold後のtouchcancel動作を抑制
	$(".pswp").on("taphold", "a", function(){
		$(this).one("touchcancel", false);
	});

	// @note PhotoSwipeで2重でタッチ／マウスイベントが発生する問題を対策
	if (/Android|iOS/.test($.grist.platform)) {
		$(".pswp").on("mouseup mousedown mousemove", false);
	}
});

/**
 * 画像ギャラリー 選択ダウンロード
 */
$(document).one("pagecreate", function(){
	var grGallery = {
		_state: "swipe",

		state: function(elem, state){
			if (grGallery._state == state) return;

			grGallery._state = state;
			$(elem).removeClassGroup("gr-gallery-").addClass("gr-gallery-" + grGallery._state);

			if (grGallery._state == "download") {
				$(elem).find("a").grDownload("on");
			} else {
				$(elem).find("a").grDownload("off").removeClass("gr-focus gr-imgbox-icon ui-icon-check");
			}
		},

		refresh: function(elem){
			if (grGallery._state == "download") {
				$(elem).find("a").grDownload("on");
			}
		},

		select: function(elem){
			$(elem).find("a")
				.grDownload("on")
				.addClass("gr-focus gr-imgbox-icon ui-icon-check")
				.removeClass("gr-imgbox-icon-weak");
		},

		deselect: function(elem){
			$(elem).find("a")
				.grDownload("off")
				.removeClass("gr-focus gr-imgbox-icon gr-imgbox-icon-weak ui-icon-check");
		},

		download: function(elem){
			$(elem).removeClassGroup("gr-gallery-").addClass("gr-gallery-download");

			// @todo iOS版開発中
			if ($.grist.opts.developMode == "on" && $.grist.platform == "iOS") {
				$(elem).closest(".ui-page").find("a.gr-commit").attr("href", grDownloadScheme(grImages()));
				$(elem).find("a.gr-download").removeClass("ui-icon-check").trigger("click");
				setTimeout(function(){
					$(elem).find("a.gr-download").grDownload("off");
				}, 0);
				$(elem).removeClassGroup("gr-gallery-").addClass("gr-gallery-" + grGallery._state);
				return;
			}

			$(elem).find("a.gr-download").each(function(){
				var e;

				$(this).removeClass("ui-icon-check");

				e = document.createEvent("MouseEvents");
				e.initEvent("click", true, false);
				this.dispatchEvent(e);

				$(this).grDownload("off");
			});

			$(elem).removeClassGroup("gr-gallery-").addClass("gr-gallery-" + grGallery._state);
		}
	};

	// ギャラリー状態設定プラグイン
	$.fn.extend({
		grGallery: function(method){
			var args = arguments;

			this.each(function(){
				args[0] = this;
				grGallery[method].apply(grGallery, args);
			});

			return this;
		},
	});

	// 画像選択
	$(document).on("vclick click", ".gr-gallery.gr-gallery-select a", function(){
		if (!$(this).hasClass("gr-download")) {
			$(this)
				.grDownload("on")
				.addClass("gr-focus gr-imgbox-icon ui-icon-check")
				.removeClass("gr-imgbox-icon-weak");
		} else {
			$(this)
				.grDownload("off")
				.removeClass("gr-focus gr-imgbox-icon gr-imgbox-icon-weak ui-icon-check");
		}

		$(this).closest(".gr-gallery").trigger("change");

		return false;
	});

	// ダウンロード開始時のアイコンフィードバック
	$(document).on("click", ".gr-gallery.gr-gallery-download a.gr-download", function(){
		var ICON_FEEDBACK_PERIOD = 1 * 1000,
			self = this,
			iconFeedback = $(this).data("iconFeedback.download") || null;

		clearTimeout(iconFeedback);
		iconFeedback = null;

		iconFeedback = setTimeout(function(){
			iconFeedback = null;
			$(self)
				.removeClass("gr-focus ui-icon-arrow-d")
				.addClass("gr-imgbox-icon gr-imgbox-icon-weak ui-icon-arrow-d")
				.removeData("iconFeedback.download");
		}, ICON_FEEDBACK_PERIOD);

		$(this)
			.addClass("gr-focus gr-imgbox-icon ui-icon-arrow-d")
			.removeClass("gr-imgbox-icon-weak")
			.data("iconFeedback.download", iconFeedback);
	});
});

/**
 * 自動デモ
 */
$(document).one("pagecreate", function(){
	$("#gr-demo").on("click", function(){
		$.grist.m.popup
			.open({ html: "<h3>Starting Demo</h3><p>Touch screen to terminate.</p>"}, 3 * 1000)
			.elem().one("popupafterclose", function(){
				$.grist.cam.fallback.randomViewEnabled = true;
				$.grist.m.demo.scenario = $.gr.demoScenarios.basic;
				$.grist.m.demo.start().always(function(){
					$.grist.m.popup
						.open({ html: "<h3>Demo Terminated</h3>" }, 3 * 1000)
						.elem().one("popupafterclose", function(){
							$.grist.cam.fallback.randomViewEnabled = false;
							$("body").pagecontainer("getActivePage").trigger("pagerefresh");
						});
				});
			});
	});
});

/*--------------------------------------------------------------------------*/
/**
 * 全体動作
 */
$(document).one("pagecreate", function(){
/* @note 操作性を考慮し、常にメニューを開く
	// 右Swipeでメニューを開く／前ページに戻る
	$(document).on("swiperight", ".ui-page", function(){
		var activePage = $(".ui-page-active"),
			headerLeftBtn = activePage.find(".ui-header a.ui-btn-left");

		if (headerLeftBtn.attr("href") == "#gr-menu") {
			if (activePage.jqmData("panel") != "open") {
				$("#gr-menu").panel("open");
			}
		} else if (headerLeftBtn.jqmData("rel") == "back") {
			$.grist.lastClick = headerLeftBtn; // @todo 次のページでわかるように
			history.back();
		}
	});
*/
	// 右Swipeでメニューを開く
	$(document).on("swiperight", ".ui-page", function(){
		if ($(".ui-page-active").jqmData("panel") != "open") {
			$("#gr-menu").panel("open");
		}
	});

	// 左Swipeでクイックビューを開く
	$(document).on("swipeleft", "#gr-home, #gr-viewer, #gr-viewer-gallery, #gr-presets, #gr-utils", function(){
		if ($(".ui-page-active").hasClass("gr-state-select")) return;

		if ($(".ui-page-active").jqmData("panel") != "open") {
			$("#gr-quickview").panel("open");
		}
	});
});

/**
 * メニューパネル
 */
$(document).one("panelcreate", "#gr-menu", function(){
	var roulette = $.grist.Roulette("phrases.json");

	// フレーズの変更
	$(this).on("panelclose", function(){
		$("#gr-phrase").html(roulette.get().text);
	});
});

/**
 * コマンダーページ
 */
$(document).one("pagecreate", "#gr-home", function(){
	var controlPage = 2,
		lensLocked = $("#gr-lenslock").val() == "Lock",
		focusLocked = false,
		captureRunning = false,
		lvFlipped = false;

	function cancelFocus() {
		if (focusLocked) {
			$("#gr-focus").val(focusLocked = false).trigger("change");
		}
	}

	function cancelShutter() {
		if (captureRunning) {
			$("#gr-shutter").val(captureRunning = false).trigger("change");
		}
	}

	// ページ遷移
	$(this)
		.on("pagebeforeshow", function(){
			$("#gr-control-navbar a:jqmData(gr-control-page=" + controlPage + ")").addClass("ui-btn-active");
		})
		.on("pageshow pagerefresh", function(){
			$("#gr-view img").css("background-image", "url('" + $.gr.getViewURL() + "')");
		})
		.on("pagebeforehide", function(){
			cancelFocus();
			cancelShutter();
		})
		.on("pagehide", function(){
			$("#gr-view img").css("background-image", "");
		});

	// コントロールパネルページ遷移
	$("#gr-control-navbar").on("vclick", "a:jqmData(gr-control-page)", function(){
		$("#gr-control .gr-cpanel:jqmData(gr-control-page=" + controlPage + ")").hide();
		controlPage = $(this).jqmData("gr-control-page");
		$("#gr-control .gr-cpanel:jqmData(gr-control-page=" + controlPage + ")").show();
	})

	// ボタンClick時のフォーカスロック解除
	$("#gr-control").on("vclick", "a:jqmData(gr)", function(){
		if (!$(this).hasClass("gr-keep-focus")) {
			cancelFocus();
		}
		if (!$(this).hasClass("gr-keep-shutter")) {
			cancelShutter();
		}
	});

	// セレクト変更時のフォーカスロック解除
	$("#gr-control").on("change", ".gr-select", function(){
		if (!$(this).hasClass("gr-keep-focus")) {
			cancelFocus();
		}
		if (!$(this).hasClass("gr-keep-shutter")) {
			cancelShutter();
		}
	});

	// シャッター維持ボタン
	$("#gr-control").on("vclick", "#gr-shutter-hold", function(){
		if (lensLocked) {
			$.gr.postCommands("cmd=bnull");
			return;
		}

		$("#gr-focus").val(focusLocked = true).trigger("refresh");

		// コマンドでフォーカスロックを解除
		$("#gr-focus, #gr-shutter")
			.off("change.shutterHold")
			.one("change.shutterHold", function(){
				$("#gr-focus, #gr-shutter").off("change.shutterHold");
				$.gr.postCommands("cmd=brl 0");
			});
	});

	// レンズロックスイッチ
	$("#gr-lenslock").on("change", function(){
		lensLocked = $(this).val() == "Lock";
	});

	// フォーカスボタン
	$("#gr-focus")
		.on("vclick", function(){
			if (lensLocked) {
				$.gr.postCommands("cmd=bnull");
				return;
			}
			if (captureRunning) return;
			$(this).val(focusLocked = !focusLocked).trigger("change");
		})
		.on("change", function(){
			$(this).val(focusLocked).trigger("refresh");

			$.grist.m.busy(function(){
				return $.gr.callAPI(focusLocked ? "lens/focus/lock" : "lens/focus/unlock");
			})
		})
		.on("refresh", function(){
			$(this)[$(this).val() ? "addClass" : "removeClass"]("ui-btn-active");
		});

	// シャッターボタン
	$("#gr-shutter")
		.on("vclick", function(){
			if (lensLocked) {
				$.gr.postCommands("cmd=bnull");
				return;
			}

			$(this).val(captureRunning = !captureRunning).trigger("change");
		})
		.on("change", function(){
			var self = this;

			$("#gr-focus").val(focusLocked = false).trigger("refresh");

			$.grist.m.busy(function(){
				if (!captureRunning) {
					$(self).val(captureRunning).trigger("refresh");
					return $.gr.callAPI("camera/shoot/finish");
				} else {
					return $.gr.callAPI("camera/shoot?af=camera").always(function(resp){
						if (resp && resp.errMsg == "Precondition Failed") {
							return $.gr.callAPI("camera/shoot/start?af=camera").done(function(){
								$(self).val(captureRunning).trigger("refresh");
							});
						} else {
							captureRunning = false;
						}
					});
				}
			});
		})
		.on("refresh", function(){
			$(this)[$(this).val() ? "addClass" : "removeClass"]("ui-btn-active");
		});

	// タッチフォーカス
	$("#gr-view").on("vclick", function(e){
		var touchAction = $("body").hasClass("gr-landscape") ? "capture" : $.grist.opts.lvTouch,
			api = touchAction == "capture" ? "camera/shoot" : "lens/focus/lock",
			focusX = Math.round((e.pageX - $(this).offset().left) * 100 / $(this).width()),
			focusY = Math.round((e.pageY - $(this).offset().top) * 100 / $(this).height());

		if (lensLocked) {
			$.gr.postCommands("cmd=bnull");
			return;
		}

		if (captureRunning) return;

		if (lvFlipped) {
			focusX = 100 - focusX;
		}

		focusLocked = touchAction != "capture";
		$("#gr-focus").val(focusLocked).trigger("refresh");

		$.grist.m.busy(function(){
			return $.gr.callAPI(api, { pos: focusX + "," + focusY });
		});
	});

	// 現在の設定を強制同期
	$(this).find(".gr-sync").on("vclick", function(){
		$.grist.m.busy("Transmitting", function(){
			var cmds = [];

			$("#gr-home").find("option:selected:jqmData(gr)").each(function(){
				cmds.push($(this).jqmData("gr"));
			});

			$("#gr-home").find("a:jqmData(gr-on), a:jqmData(gr-off)").each(function(){
				var cmd = $(this).jqmData($(this).val() ? "gr-on" : "gr-off");

				if (cmd != "") {
					cmds.push(cmd);
				}
			});

			return $.gr.postCommands(cmds);
		});
	});

	// @todo 左右鏡像
	$(this).find(".gr-flip").on("change", function(){
		lvFlipped = $(this).val() || false;

		$("#gr-view img")[lvFlipped ? "addClass" : "removeClass"]("gr-reflect-lr");
	});
});

/**
 * 詳細設定パネル
 */
$(document).one("panelcreate", "#gr-advanced", function(){
	// 設定パネル
	$("#gr-sets")
		.on("submit", function(){
			var commands = [], props = [];

			$(this).find("option:selected:jqmData(gr)").each(function(){
				var cmds = $(this).jqmData("gr").split("&");

				$.each(cmds, function(){
					if (/pset=(.*)/i.test(this)) {
						props.push(RegExp.$1);
					} else {
						commands.push(this);
					}
				});
			});
			if (props.length > 0) {
				commands.push("mpset=" + props.join(" "));
			}

			if (commands.length > 0) {
				commands.push("cmd=mode refresh");

				$.grist.m.busy("Transmitting", function(){
					return $.gr.postCommands(commands);
				});
			}

			return false;
		})
		.on("refresh", function(){
			var panel = $(this).closest(".ui-panel"),
				commitBtn = panel.find(".gr-commit"),
				resetBtn = panel.find(".gr-reset"),
				modified = false;

			$(this).find("select").each(function(){
				var checked = $(this).val() != "";

				modified = modified || checked;
			});

			commitBtn.text(modified ? "Transmit" : "Done");
			resetBtn[modified ? "show" : "hide"]();
		})
		.on("change", "select", function(){
			$("#gr-sets").trigger("refresh");
		});

	// パネル表示準備
	$(this).on("panelbeforeopen", function(){
		$("#gr-sets").trigger("refresh");
	});

	// 実行ボタン
	$(this).find(".gr-commit").on("click", function(){
		$("#gr-sets").submit();
	});

	// リセットボタン
	$(this).find(".gr-reset").on("click", function(){
		$("#gr-sets").trigger("reset").trigger("refresh");
	});
});

/**
 * クイックビュー
 */
$(document).one("panelcreate", "#gr-quickview", function(){
	var panel = $(this);

	// 最近画像ロード
	function loadRecentImages(gallery, lastIndex, size) {
		var imageLinks = $(gallery).find("a"),
			index = $.gr.viewerFileList.length + lastIndex + 1 - imageLinks.length;

		if (index < 0) index = 0;

		imageLinks.each(function(){
			var file;

			file = $.gr.viewerFileList[index++];
			if (file == undefined) return false;

			if ($(this).find("img").is(":visible")) return;

			$(this).attr("href", $.gr.getImageURL({ fn: file.fn, size: "view", orient: file.orient }));
			$(this).attr("data-gr-pid", file.pid);

			$(this).find("img")
				.grLoadImage($.gr.getImageURL({ fn: file.fn, size: size, orient: file.orient }))
				.attr("alt", $.grist.uri.filename(file.fn));
		});
	}

	// 最新画像表示
	$("#gr-quick-single").on("refresh", function(){
		var fn;

		loadRecentImages(this, -1, "view");

		if ($.gr.viewerFileList.length == 0) return;
		fn = $.gr.viewerFileList[$.gr.viewerFileList.length - 1].fn;

		panel.find("a.gr-act-download").each(function(){
			$(this).attr({
				href: $.gr.getDownloadURL({ fn: fn, size: $(this).data("gr-download-size") }),
				target: "_blank",
				download: $.grist.opts.dlMethod == "direct" ? "" : null
			});
		});
	});

	// 最近画像表示
	$("#gr-quick-multi").on("refresh", function(){
		loadRecentImages(this, -1, "thumb");

		panel.find("a.gr-act-download").each(function(){
			$(this).attr({ href: "#", target: null, download: null });
		});
	});

	// 最近画像ダウンロード
	$(this).on("vclick", "a.gr-act-download", function(){
		var btnText = $(this).text();

		if (!$("#gr-quick-multi").is(":visible")) return;
		if ($.gr.viewerFileList.length == 0) return;

		$.gr.activeDlSize = $(this).data("gr-download-size");

		if (btnText != "Done") {
			$("#gr-download-title").text(btnText);
			panel.addClass("gr-state-select");
			panel.find("a.gr-act-download").not(this).css("visibility", "hidden");
			$(this).text("Done");
			$("#gr-quick-multi").grGallery("state", "download");
		} else {
			panel.removeClass("gr-state-select");
			panel.find("a.gr-act-download").not(this).css("visibility", "");
			$(this).text($.grist.opts.dlSize == "select" ? $(this).data("orgText") : "Download");
			$("#gr-quick-multi").grGallery("state", "photoswipe");
		}
	})

	// 表示形式ページ遷移
	$("#gr-quickview-navbar").on("vclick", "a", function(){
		var page = $(this).closest("li").index();

		if (page != panel.attr("data-gr-navbar-page")) {
			panel.attr("data-gr-navbar-page", page);
			panel.find(".gr-gallery:visible").trigger("refresh");
			panel.find("a.gr-act-download").css("visibility", "");
		}
	});

	// パネル表示準備
	$(this).on("panelbeforeopen", function(){
		var activeNavPage = $(this).attr("data-gr-navbar-page"),
			size;

		$(this).find("img").hide();

		$("#gr-quickview-navbar a").eq(activeNavPage).addClass("ui-btn-active");
		panel.removeClass("gr-state-select");
		panel.find("a.gr-act-download").each(function(){
			$(this).text($(this).data("orgText")).css("visibility", "");
		});

		// ダウンロードボタン作成
		if ($.grist.opts.dlSize == "select") {
			panel.find("[data-gr-download-size]").show();
		} else {
			panel.find("[data-gr-download-size]").hide();
			size = $.grist.opts.dlSize == "vga" ? "view" : "full";
			panel.find("[data-gr-download-size=" + size + "]").text("Download").show();
		}
	});

	// パネル表示
	$(this).on("panelopen", function(){
		// ファイル一覧取得
		$(document).trigger("list");
	});

	// パネル終了
	$(this).on("panelclose", function(){
		// @todo DL取り除き
	});

	// ファイル一覧取得
	$(this).on("listload", function(){
		panel.find(".gr-gallery:visible").trigger("refresh");
		panel.find("a.gr-act-download")[$.gr.viewerFileList.length > 0 ? "removeClass" : "addClass"]("ui-state-disabled");
	});

	// パネル初期化
	panel.find("a.gr-act-download").each(function(){
		$(this).data("orgText", $(this).text());
	});
});

/**
 * 画像ビューアページ
 */
$(document).one("pagecreate", "#gr-viewer", function(){
	var folderView = $("#gr-folderview"),
		activeContents = "";

	// フォルダリストアイテムのコンテンツ生成
	function folderItemContents(page, files, note) {
		var contents = "",
			pageTitle = $.gr.getViewerPageTitle(page),
			imageURL =  $.grist.image.null,
			lastFile;

		if (files.length > 0) {
			lastFile = files[files.length - 1];
			imageURL = $.gr.getImageURL({ fn: lastFile.fn, size: "thumb", orient: lastFile.orient });
		}

		contents += '<li>';
		contents +=   '<a href="#gr-viewer-gallery" fd="' + page + '" title="' + pageTitle + '" data-transition="slidefade" class="gr-link-bottom">';
		contents +=     '<img src="' + $.grist.image.null + '" alt="' + pageTitle + '" class="gr-thumb gr-thumb-mini" data-gr-src="' + imageURL + '" style="display: none;">';
		contents +=     '<h2>' + pageTitle + '</h2>';
		contents +=     '<p>' + note + '</p>';
		contents +=     '<span class="ui-li-count">' + files.length + '</span>';
		contents +=   '</a>';

		return contents;
	}

	// フォルダリストのコンテンツ生成
	function folderContents() {
		var todaysContents = "", folderContents = "",
			contents;

		$.each($.gr.viewerPages, function(i, page){
			var files = $.gr.viewerPageFiles[page],
				note, latest;

			if (page.indexOf("today") == 0) {
				latest = 0;
				$.each(files, function(i, file){
					latest = Math.max(latest, file.date.getTime());
				});
				note = latest == 0 ? "No Photos" : "Latest: " + $.grist.util.toLocaleTimeString(new Date(latest)).replace(/:\d+( |$)/, "\$1");
				todaysContents += folderItemContents(page, files, note);
			} else {
				note = "";
				if (files.length > 0) {
					note = $.grist.uri.filename(files[0].fn).replace(/\..*$/, "");
				}
				if (files.length > 1) {
					note += " - " + $.grist.uri.filename(files[files.length - 1].fn).replace(/\..*$/, "");
				}
				folderContents += folderItemContents(page, files, note);
			}
		});

		contents = todaysContents;

		if (folderContents != "") {
			contents += '<li data-role="list-divider">FOLDERS</li>';
			contents += folderContents;
		}

		return contents;
	}

	// ページ表示
	$(this).on("pageshow pagerefresh", function(e){
		var contents;

		// ファイル一覧取得（未取得の場合）
		if (!$.gr.fileListLoaded) {
			$(document).trigger("list");
			return;
		}

		// ファイル一覧取得
		if (e.type == "pageshow") {
			// @todo ブラウザのバックボタンは判定できない
			if ($.grist.lastClick.data("rel") != "back") {
				$(document).trigger("list");
			}
		}

		// コンテンツ変化判断
		contents = folderContents();
		if (contents == activeContents) return;
		activeContents = contents;

		// ページコンテンツ作成
		folderView.html(activeContents).listview("refresh");
		$(this).trigger("enhance");

		folderView.find("img[data-gr-src]:hidden").each(function(){
			$(this).grLoadImage($(this).data("gr-src"));
		});
	});

	// ファイル一覧取得
	$(this).on("listload", function(e, param){
		if (param == "error") {
			folderView.html(activeContents = "").listview("refresh");
		}
		if (param == "modified") {
			$(this).trigger("pagerefresh");
		}
	});

	// ページ初期化
	folderView.html(activeContents).listview("refresh");
});

/**
 * 画像ギャラリーページ
 */
$(document).one("pagecreate", "#gr-viewer-gallery", function(){
	var page = $(this),
		pageHeader = $(this).find(".ui-header"),
		thumbView = $("#gr-thumbview");

	// ページヘッダ作成
	function buildGalleryHeader() {
		var title = $.gr.getViewerPageTitle($.gr.activeViewerPage),
			actionBtn = pageHeader.find("a.gr-action"),
			size;

		// タイトル設定
		if (!page.hasClass("gr-state-select")) {
			pageHeader.find(".ui-title").text(title);
		}

		// アクションボタン作成
		if ($.grist.opts.dlSize != "select") {
			size = $.grist.opts.dlSize == "vga" ? "view" : "full";
			actionBtn
				.attr("href", "#")
				.addClass("gr-act-download").data("gr-download-size", size);
		} else {
			actionBtn
				.attr("href", "#gr-gallery-action")
				.removeClass("gr-act-download").removeData("gr-download-size");
		}
	}

	// ページナビゲーション作成
	function buildGalleryNavigation() {
		var index = $.inArray($.gr.activeViewerPage, $.gr.viewerPages),
			today = $.gr.activeViewerPage.indexOf("today");

		$.each([
			{ btn: page.find("a.gr-prev"), fd: $.gr.viewerPages[index - 1] }, 
			{ btn: page.find("a.gr-next"), fd: $.gr.viewerPages[index + 1] }
		], function(){
			if (this.fd && this.fd.indexOf("today") == today) {
				this.btn.attr("fd", this.fd).removeClass("ui-disabled");
			} else {
				this.btn.removeAttr("fd").addClass("ui-disabled");
			}
		});
	}

	// 画像ギャラリーのコンテンツ生成
	function galleryContents(files) {
		var contents = "";

		$.each(files, function(){
			var filename = $.grist.uri.filename(this.fn),
				imageLink = $.gr.getImageURL({ fn: this.fn, size: "view", orient: this.orient }),
				imageURL = $.gr.getImageURL({ fn: this.fn, size: "thumb", orient: this.orient });

			contents += '<li>';
			contents +=   '<a href="' + imageLink + '" title="' + filename + '" class="gr-imgbox" data-gr-pid="' + this.pid + '">';
			contents +=     '<img src="' + $.grist.image.null + '" alt="' + filename + '" class="gr-thumb" data-gr-src="' + imageURL + '" style="display: none;">';
			contents +=   '</a>';
		});

		return contents;
	}

	// ページ表示準備
	$(this).on("pagebeforeshow pagerefresh viewerpagechange", function(e){
		var contents = "",
			actionBtn = pageHeader.find("a.gr-action"),
			viewerPageFiles,
			navHidden, commitEnabled;

		// 画像選択状態初期化
		if (e.type != "viewerpagechange") {
			if (page.hasClass("gr-state-select")) {
				$(this).find("a.gr-cancel").trigger("click");
			}
		}

		// ヘッダ作成
		buildGalleryHeader();
		$("#gr-no-photos, #gr-thumbview-holder").hide();
		actionBtn.addClass("ui-disabled");

		// ファイル一覧取得（未取得の場合）
		if (!$.gr.fileListLoaded) {
			$(document).trigger("list");
			return;
		}

		// ページコンテンツ作成
		viewerPageFiles = $.gr.viewerPageFiles[$.gr.activeViewerPage];
		if (viewerPageFiles != undefined) {
			buildGalleryNavigation();
			contents = galleryContents(viewerPageFiles);
		}
		thumbView.html(contents);

		if (viewerPageFiles && viewerPageFiles.length != 0) {
			$("#gr-thumbview-holder").show();
			$("#gr-no-photos").hide();
			actionBtn.removeClass("ui-disabled");
		} else {
			$("#gr-thumbview-holder").hide();
			$("#gr-no-photos").show();
			actionBtn.addClass("ui-disabled");
		}

		$(this).find("a.gr-to-bottom, a.gr-to-top").hide();
		$(this).find("a.gr-prev, a.gr-next").css("visibility", "");
		$(this).find("a.gr-commit").addClass("ui-disabled");
	});

	// ページ表示
	$(this).on("pageshow pagerefresh viewerpagechange", function(){
		var images = thumbView.find("img[data-gr-src]:hidden"),
			contentHeight = $(this).find(".ui-content").outerHeight(true) + pageHeader.outerHeight(true);

		// タイトル設定
		document.title = pageHeader.find(".ui-title").text();

		// ページTop/Bottomボタン表示
		if (contentHeight > $.mobile.getScreenHeight()) {
			page.find("a.gr-to-bottom, a.gr-to-top").fadeIn();
		}

		if ($.grist.lastClick.hasClass("gr-link-bottom")) {
			$.grist.m.scroll($(this).height());
			images = $(images.get().reverse());
		}

		images.each(function(){
			$(this).grLoadImage($(this).data("gr-src"));
		});
	});

	// ページ終了
	$(this).on("pagehide", function(){
		var images = thumbView.find("img[data-gr-src]");

		if (page.hasClass("gr-state-select")) {
			$(this).find("a.gr-cancel").trigger("click");
		}

		images.each(function(){
			$(this).attr("src", $.grist.image.null);
		});
	});

	// ファイル一覧取得
	$(this).on("listload", function(e, param){
		if (param == "error") {
			buildGalleryHeader();
			thumbView.html("");
		}
		if (param == "modified") {
			$(this).trigger("pagerefresh");
		}
	});

	// ページ初期化
	thumbView.html("");
});

/**
 * 画像ギャラリーページ 選択ダウンロード
 */
$(document).one("pagecreate", "#gr-viewer-gallery", function(){
	var page = $(this),
		pageHeader = $(this).find(".ui-header"),
		thumbView = $("#gr-thumbview");

	// 画像選択状態更新
	$(this).on("selectrefresh", function(){
		var hasChecked = thumbView.find("a.ui-icon-check").length,
			hasUnchecked = thumbView.find("a:not(.ui-icon-check)").length;

		$(this).find("a.gr-prev, a.gr-next").css("visibility", hasChecked ? "hidden" : "");
		$(this).find("a.gr-commit")[hasChecked ? "removeClass" : "addClass"]("ui-disabled");

		$(this).find("a.gr-select-all").text(hasUnchecked ? "Select All" : "Deselect All");
	});

	// 画像選択操作開始
	$(this).on("click", "a.gr-act-download", function(){
		var btnText = $(this).text();

		$.gr.activeDlSize = $(this).data("gr-download-size");

		pageHeader.find(".ui-title").text(btnText);
		document.title = btnText;

		thumbView.grGallery("state", $.grist.opts.galleryAction);
		page.attr("data-gr-gallery-action", $.grist.opts.galleryAction);
		page.addClass("gr-state-select");
		page.trigger("selectrefresh");

		// @todo ダウンロード中切断の対策
		$.grist.opts.disablePing = "on";
	});

	// 画像選択操作終了
	$(this).on("click", "a.gr-cancel", function(){
		var title = $.gr.getViewerPageTitle($.gr.activeViewerPage);

		pageHeader.find(".ui-title").text(title);
		document.title = title;

		thumbView.grGallery("state", "photoswipe");
		page.removeClass("gr-state-select");
		page.trigger("selectrefresh");
	});

	// 画像選択状態変化
	thumbView.on("change", function(){
		page.trigger("selectrefresh");
	});

	// ページナビゲーション
	$(this).on("viewerpagechange", function(){
		thumbView.grGallery("refresh");
	});

	// ダウンロード開始
	$(this).on("click", "a.gr-commit", function(){
		thumbView.grGallery("download");
		page.trigger("selectrefresh");
	});

	// 全選択
	$(this).on("click", "a.gr-select-all", function(){
		thumbView.grGallery($(this).text() == "Select All" ? "select" : "deselect");
		page.trigger("selectrefresh");
	});
});

/**
 * プリセットページ
 */
$(document).one("pagecreate", "#gr-presets", function(){
	var activeBtn = undefined;

	// 既選択ボタンのキャンセル
	$(this)
		.on("vclick", "a.ui-btn:jqmData(gr)", function(){
			if (activeBtn) {
				$.gr.postCommands($(activeBtn).jqmData("gr-off"));
				$.gr.postCommands("delay=1000");
				$(activeBtn).val(false).trigger("refresh");
				activeBtn = undefined;
			}
		})
		.on("change", "a.ui-btn:jqmData(gr-on), a.ui-btn:jqmData(gr-off)", function(){
			if ($(this).val()) {
				if (activeBtn) {
					$.gr.postCommands($(activeBtn).jqmData("gr-off"));
					$.gr.postCommands("delay=1000");
					$(activeBtn).val(false).trigger("refresh");
				}
				activeBtn = this;
			} else {
				activeBtn = undefined;
			}
		});

	// ページ遷移
	$(this)
		.on("pagebeforeshow", function(){
			$("#gr-miniview-holder img").attr("src", $.grist.image.null);
		})
		.on("pageshow pagerefresh", function(){
			$("#gr-miniview-holder img").attr("src", $.gr.getViewURL());
		})
		.on("pagehide", function(){
			$("#gr-miniview-holder img").attr("src", $.grist.image.null);
		});

	$("#gr-miniview-single img").on("vclick", function(){
		$("#gr-miniview-single").fadeOut("fast").promise().done(function(){
			$("#gr-miniview-multi").fadeIn("fast");
		});
	});

	$("#gr-miniview-multi img").on("vclick", function(){
		$("#gr-miniview-single img").attr("class", $(this).attr("class") || "");

		$("#gr-miniview-multi").fadeOut("fast").promise().done(function(){
			$("#gr-miniview-single").fadeIn("fast");
		});
	});

	$("#gr-miniview-multi").hide();
});

/**
 * ユーティリティページ
 */
$(document).one("pagecreate", "#gr-utils", function(){
	var REFRESH_INTERVAL = 60 * 1000,
		self = this,
		roulette = $.grist.Roulette("history.json"),
		grFallbackInfo = { Model: "GR1", Clock: "1996-10-01T00:00:00", Storage: "36 Exp free, 36 Exp total", Battery: "Full" },
		grInfo = {},
		grClock = "",
		lastGRInfo = {},
		clockInterval = null,
		refreshInterval = null;

	// GR情報更新
	$("#gr-info").on("refresh", function(){
		$(this).find("tr").each(function(){
			var item = $(this).find("th").text(),
				info = grInfo[item];

			$(this).find("td").text(item == "Clock" ? grClock : info);
		});
	});

	// 時計定期更新
	function periodicalRefresh() {
		var grStart = $.grist.util.fromLocalISOTime(grInfo["Clock"]).getTime(),
			start = Date.now();

		clearInterval(clockInterval);
		clockInterval = null;

		function refreshGRInfo() {
			var delta = Date.now() - start;

			grClock = $.grist.util.toLocaleString(new Date(grStart + delta));
			$("#gr-info").trigger("refresh");
		}

		refreshGRInfo();
		clockInterval = setInterval(refreshGRInfo, 1000);
	}

	// ページ表示準備
	$(this).on("pagebeforeshow", function(){
		$("#gr-info td").text("");
	});

	// ページ表示
	$(this).on("pageshow pagerefresh clockrefresh infocorrect", function(e){
		var promises = [],
			info = {};

		if (e.type != "infocorrect") {
			clearInterval(refreshInterval);
			refreshInterval = null;
			lastGRInfo = {};

			grFallbackInfo = roulette.get() || grFallbackInfo;
			grInfo = grFallbackInfo;
		}

		promises.push(
			$.gr.getData("constants/device").done(function(data){
				if (data.model == undefined || data.firmwareVersion == undefined) return;
				info["Model"] = data.model + " " + Number(data.firmwareVersion).toFixed(2);
			})
		);

		promises.push(
			$.gr.getData("params/device").done(function(data){
				if (data.datetime == undefined) return;
				info["Clock"] = data.datetime;
			})
		);

		promises.push(
			$.gr.postCommands("mpget=" + [
				"BATTERY_LEVEL",
				"REMAINING_MEDIA_SIZE_H", "REMAINING_MEDIA_SIZE_L",
				"TOTAL_MEDIA_SIZE_H", "TOTAL_MEDIA_SIZE_L"
			].join(" ")).done(function(data){
				var battery, storage;

				if (data["BATTERY_LEVEL"] == undefined) return;
				if (data["REMAINING_MEDIA_SIZE_H"] == undefined) return;
				if (data["REMAINING_MEDIA_SIZE_L"] == undefined) return;
				if (data["TOTAL_MEDIA_SIZE_H"] == undefined) return;
				if (data["TOTAL_MEDIA_SIZE_L"] == undefined) return;

				battery = data["BATTERY_LEVEL"] ? /BATTERY_LEVEL_(.+)/i.exec(data["BATTERY_LEVEL"])[1] : "Unknown",
				info["Battery"] = $.grist.util.toTitleCase(battery);

				storage = {
					remain: ((data["REMAINING_MEDIA_SIZE_H"] << 12) | (data["REMAINING_MEDIA_SIZE_L"] >>> 20)) / 1024,
					total: ((data["TOTAL_MEDIA_SIZE_H"] << 12) | (data["TOTAL_MEDIA_SIZE_L"] >>> 20)) / 1024
				};

				$.map(["remain", "total"], function(elem){
					var digits = storage[elem] < 10 ? 2 : storage[elem] < 100 ? 1 : 0;

					storage[elem] = storage[elem].toFixed(digits);
				});

				info["Storage"] = storage.remain + " GB free, " + storage.total + " GB total";
			})
		);

		$.when.apply($, promises)
			.done(function(){
				$.extend(grInfo, info);

				if (refreshInterval == null) {
					refreshInterval = setInterval(function(){
						$(self).trigger("infocorrect");
					}, REFRESH_INTERVAL);
				}
			})
			.always(function(){
				if (JSON.stringify(grInfo) != JSON.stringify(lastGRInfo)) {
					lastGRInfo = grInfo;
					periodicalRefresh();
				}
			});
	});

	// ページ終了準備
	$(this).on("pagebeforehide", function(){
		clearInterval(clockInterval);
		clockInterval = null;
		clearInterval(refreshInterval);
		refreshInterval = null;
	});

	// 時刻同期
	$("#gr-clock").on("vclick", function(){
		var localISOTime = $.grist.util.toLocalISOTime(Date.now());

		$.grist.m.busy("Transmitting", function(){
			return $.gr.putData("params/device", { datetime: localISOTime.replace(/\..*/, "") });
		})
		.always(function(){
			$.grist.m.notify(this.state() == "resolved" ? "SUCCESS" : "ERROR");
			$(self).trigger("clockrefresh");
		});
	});
});

/**
 * Reset GRパネル
 */
$(document).one("panelcreate", "#gr-reset", function(){
	var self = this;

	$(this).on("vclick", "a:jqmData(gr)", function(){
		var command = $(this).jqmData("gr");

		$.grist.m.busy("Transmitting", function(){
			return $.gr.postCommands(command);
		})
		.done(function(){
			$.grist.m.notify("SUCCESS").always(function(){
				$(self).panel("close");
			});
		})
		.fail(function(){
			$.grist.m.notify("ERROR");
		});

		return false;
	});
});

/**
 * Wi-Fi設定パネル
 */
$(document).one("panelcreate", "#gr-wifi", function(){
	var self = this;

	// 設定反映
	$(this).on("submit", function(){
		var info = {
				ssid: $(self).find("input[name=wifiSSID]").val(),
				key: $(self).find("input[name=wifiPassword]").val(),
				channel: $(self).find("select[name=wifiChannel]").val()
			};

		$.grist.m.busy("Transmitting", function(){
			return $.gr.putData("params/device", info);
		})
		.done(function(){
			$.grist.m.notify("SUCCESS").always(function(){
				$(self).panel("close");
			});
		})
		.fail(function(){
			$.grist.m.notify("ERROR");
		});

		return false;
	});

	// 入力内容更新
	$(this).find("input").on("input blur", function(){
		var acceptCommit = $(self).find("input").filter(function(){
				return $(this).val().length == 0;
			}).length == 0;

		$(self).find(".gr-commit")[acceptCommit ? "removeClass" : "addClass"]("ui-disabled");
	});

	// パネル表示準備
	$(this).on("panelbeforeopen", function(){
		$(this).find("input[name=wifiSSID], input[name=wifiPassword]").val("").trigger("blur");
		$(this).find("select[name=wifiChannel]").val(1).selectmenu("refresh");

		$.gr.getData("params/device").done(function(data){
			if (data.ssid == undefined || data.key == undefined || data.channel == undefined) return;
			$(self).find("input[name=wifiSSID]").val(data.ssid).trigger("blur");
			$(self).find("input[name=wifiPassword]").val(data.key).trigger("blur");
			$(self).find("select[name=wifiChannel]").val(data.channel).selectmenu("refresh");
		});
	});
});

/**
 * セキュリティ設定パネル
 */
$(document).one("panelcreate", "#gr-security", function(){
	var self = this;

	$(this).on("submit", function(){
		var domain = $(this).find("input[name=corsOrigin]").val(),
			passcode = $(this).find("input[name=corsPasscode]").val(),
			corsHeader = /^(|\*|http:.*)$/i.test(domain) ? domain : "http://" + domain;

		$.grist.m.busy("Transmitting", function(){
			return $.Deferred(function(dfd){
				$.gr.postCommands("cmd=cors set Access-Control-Allow-Origin " + corsHeader + " " + passcode)
					.done(function(data){
						dfd[data.retCode == 0 ? "resolve" : "reject"]();
					})
					.fail(dfd.reject);
			});
		})
		.done(function(){
			$.grist.m.notify("SUCCESS").always(function(){
				$(self).panel("close");
			});
		})
		.fail(function(){
			$.grist.m.notify("ERROR");
			$.gr.postCommands("cmd=cors genpasscode");
		});

		return false;
	});

	// 入力内容更新
	$(this).find("input").on("input blur", function(){
		var domainInput = $("#gr-security input[name=corsOrigin]").val().length > 0,
			passcodeInput = $("#gr-security input[name=corsPasscode]").val().length > 0;

		$(self).find(".gr-commit")[(domainInput && passcodeInput) ? "removeClass" : "addClass"]("ui-disabled");
	});

	// パネル表示準備
	$(this).on("panelbeforeopen", function(){
		$(this).find("input[name=corsOrigin]").val("");
		$(this).find("input[name=corsPasscode]").val("");
		$(this).find("input").trigger("blur");

		$.gr.postCommands("cmd=cors genpasscode&cmd=cors get Access-Control-Allow-Origin").done(function(data){
			var corsHeader = data.retStr || "",
				domain = corsHeader.replace(/^http:\/\//, "");

			$("input[name=corsOrigin]", self).val(domain);
		});
	});

	$(this).on("panelclose", function(){
		$.gr.postCommands("cmd=cors clrpasscode");
	});
});

/**
 * 設定ページ
 */
$(document).one("pagecreate", "#gr-config", function(){
	var panelLock;

	// ファイルフォーマット
	$(this).find("input[name^=view]").on("change", function(){
		$.gr.refreshSettings();
		$.gr.clearFileList();
	});

	// アプリ設定リセット
	$("#gr-app-reset").on("click", function(){
		$.grist.localStorage().clear();
		$.grist.m.restart();
	});

	// UIテーマ設定
	$(this).find("select[name=uiTheme]").on("change", function(){
		$.grist.m.restart();
	});

	// GRロケーション設定
	$(this).find("input[name=grLocation]").on("change refresh", function(){
		var customChecked = $("#gr-location-custom").prop("checked");

		$("#gr-location-domain").textinput(customChecked ? "enable" : "disable");
	});
	$("#gr-location-custom").trigger("refresh");

	$(this).find("input[name=grLocation], #gr-location-domain").on("change", function(){
		$(document).trigger("scan");
	});

	// 開発モード
	$(this).find("input[name=developMode]").on("change", function(){
		$.gr.refreshSettings();
	});

	// 改良実験
	$(this).find("#gr-config-experimental input").on("change", function(){
		$.gr.refreshSettings();
	});

	// パネルを開く
	$(this)
		.on("pagebeforeshow", function(){
			panelLock = 0;
		})
		.on("swipeleft", function(){
			if ($(".ui-page-active").jqmData("panel") != "open") {
				if (++panelLock >= 5) {
					$("#gr-config-advanced").panel("open");
				}
			}
		});

	// @todo iOS版開発中
	if ($.grist.platform == "iOS") {
		$(this).find("select[name=galleryAction]").on("change", function(){
			if ($(this).val() == "select") {
				$.grist.m.notify("This feature is currently unsupported for iOS.", 5 * 1000);
			}
		});
	}
});

/**
 * 開発ページ
 */
$(document).one("pagecreate", "#gr-develop", function(){
	// コマンドパネル
	$("#gr-command").on("submit", function(){
		var cmd = $(this).find("input[name=cmd]").val();

		$(this).find("input[type=text]").trigger("blur");
		$("#gr-result td").text("");

		$.grist.m.busy("Transmitting", function(){
			return $.gr.postCommands("cmd=" + cmd).always(function(data){
				$("#gr-result tr:has(th:contains('errCode')) td").text(data.errCode);
				$("#gr-result tr:has(th:contains('errMsg')) td").text(data.errMsg);
				$("#gr-result tr:has(th:contains('retCode')) td").text(data.retCode);
				$("#gr-result tr:has(th:contains('retStr')) td").text(data.retStr);
			});
		});

		return false;
	});

	// テスト
	$("#gr-test-start").on("click", function(){
		$.grist.m.popup
			.open({ html: "<h3>Starting Test</h3><p>Touch screen to terminate.</p>" }, 3 * 1000)
			.elem().one("popupafterclose", function(){
				$.grist.cam.fallback.randomViewEnabled = true;
				$.grist.m.demo.scenario = $.gr.testCases[$.grist.opts.testCase];
				$.grist.m.demo.start("fast").always(function(){
					$.grist.m.popup
						.open({ html: "<h3>Test Terminated</h3>" }, 3 * 1000)
						.elem().one("popupafterclose", function(){
							$.grist.cam.fallback.randomViewEnabled = false;
							if ($("body").pagecontainer("getActivePage").attr("id") != "gr-develop") {
								$("body").pagecontainer("change", "#gr-develop");
							}
						});
				});
			});
	});

	// APIシミュレーション設定
	$(this).find("select[name=apiSimulation]").on("change", function(){
		$.gr.refreshSettings();
		$.gr.clearFileList();
		$(document).trigger("scan");
	});

	// GR情報設定
	$(this).find("input[name=grSysInfo]").on("change refresh", function(){
		var customChecked = $("#gr-sysinfo-manual").prop("checked");

		$("#gr-sysinfo-model").selectmenu(customChecked ? "enable" : "disable");
		$("#gr-sysinfo-version").textinput(customChecked ? "enable" : "disable");
	});
	$("#gr-sysinfo-manual").trigger("refresh");

	$(this).find("input[name=grSysInfo], #gr-sysinfo-model, #gr-sysinfo-version").on("change", function(){
		$.gr.refreshSettings();
	});

	// その他設定
	$(this).find("select[name=debugMode], select[name=landscapeLayout], select[name=standaloneMode], select[name=miniMode]").on("change", function(){
		$.gr.refreshSettings();
	});
});

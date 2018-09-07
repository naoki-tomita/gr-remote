/*! Copyright (c) 2015 RICOH IMAGING COMPANY, LTD. */

"use strict";

(function(){
	$.grist.m = {}
})();

/**
 * ユーティリティ関数
 */
(function(){
	$.extend($.grist.m, {
		_zindex: { front: 0, middle: 1, back: 2 },

		_loader: function(options, period, zindex){
			var loader;

			this._loader._stack = this._loader._stack || [];
			this._loader._top = function(){
				var top = null;

				$.each(this._stack, function(){
					if (this && this.length != 0) {
						top = this[this.length - 1];
						return false;
					}
				});
				return top;
			};

			loader = $.extend({}, $.Deferred(), {
				options: {},
				zindex: 0,

				_delay: function(handler, delay){
					var instance = this;

					function handlerProxy(){
						handler.apply(instance, arguments);
					};

					setTimeout(handlerProxy, delay || 0);
				},

				show: function(){
					var self = this,
						loaderStack = $.grist.m._loader._stack;

					loaderStack[this.zindex] = loaderStack[this.zindex] || [];
					loaderStack[this.zindex].push(this);

					if (self == $.grist.m._loader._top()) {
						this._delay(function(){
							$.mobile.loading("show", this.options);
						});
					}

					return this;
				},

				hide: function(){
					var self = this,
						loaderStack = $.grist.m._loader._stack,
						visible = self == $.grist.m._loader._top(),
						top;

					if (visible) {
						this._delay(function(){
							$.mobile.loading("hide");
							this.resolve();
						});
					} else {
						this._delay(function(){
							this.resolve();
						});
					}

					loaderStack[this.zindex] = $.map(loaderStack[this.zindex], function(item){
						return (item == self) ? null : item;
					});

					if (visible) {
						top = $.grist.m._loader._top();
						if (top) {
							top.show();
						}
					}

					return this;
				}
			});

			$.extend(loader.options, $.grist.m.loading.options,
				typeof options == "string" ? { text: options, textVisible: true } : options);

			loader.zindex = zindex || 0;
			loader.show();

			if (period != -1) {
				setTimeout(function(){
					loader.hide();
				}, period);
			}

			return loader;
		},

		loading: function(method, options, period){
			if (this.loading._loader) {
				this.loading._loader.hide();
				this.loading._loader = null;
			}

			if (method == "show") {
				this.loading._loader = this._loader(options, period || -1);
			}

			return this.loading._loader || $.Deferred().resolve();
		},

		notify: function(text, period){
			period = period || 2000;

			return this.loading("show", { text: text, textVisible: true, textonly: true }, period);
		},

		transfer: function(text, period){
			period = period || 2000;

			return this.loading("show", { text: text, textVisible: true }, period);
		},

		restart: function(text, period){
			text = text || "Restarting...";
			period = period || 1000;

			this.loading("show", { text: text, textVisible: true }, period).always(function(){
				location.reload();
			});
		},

		busy: function(text, func){
			var opts = { text: text, textVisible: true },
				zindex = this._zindex.middle,
				loader;

			if (typeof text != "string") {
				func = text;
				opts = { textVisible: false };
				zindex = this._zindex.back;
			}

			loader = this._loader(opts, -1, zindex);
			return (func)().always(function(){
				loader.hide();
			})
		}
	});

	$.grist.m.loading.options = {};
})();

/**
 * スクロール
 */
(function(){
	$.extend($.grist.m, {
		scroll: function(ypos, motion){
			return $.Deferred(function(dfd){
				if (ypos == $.mobile.window.scrollTop()) {
					dfd.resolve();
					return;
				}

				if (motion == "animate") {
					$("html, body").animate({ scrollTop: ypos }, 200, "swing", function(){
						dfd.resolve();
					});
				} else {
					$.mobile.silentScroll(ypos);
					dfd.resolve();
				}
			}).promise();
		},

		reveal: function(elemTop, elemBottom){
			var globalHeader = $("body > div.ui-header.ui-header-fixed"),
				activePage = $("body").pagecontainer("getActivePage"),
				pageHeader = activePage.find("div.ui-header.ui-header-fixed"),
				pageFooter = activePage.find("div.ui-footer.ui-footer-fixed"),
				screenTop, screenBottom, scrollDelta;

			screenTop = $.mobile.window.scrollTop();
			screenBottom = screenTop + $.mobile.getScreenHeight();
			if (pageHeader.length > 0) {
				screenTop = pageHeader.offset().top + pageHeader.outerHeight();
			} else if (globalHeader.length > 0) {
				screenTop = globalHeader.offset().top + globalHeader.outerHeight();
			}
			if (pageFooter.length > 0) {
				screenBottom = pageFooter.offset().top;
			}

			scrollDelta =
				(elemTop < screenTop) ? -(screenTop - elemTop) :
				(elemBottom > screenBottom) ? +(elemBottom - screenBottom) :
				0;

			return $.grist.m.scroll($.mobile.window.scrollTop() + scrollDelta, "animate");
		}
	});
})();

/**
 * ポップアップ
 */
(function(){
	$.grist.m.popup = {
		defaultHtml:
			"<div data-role='popup' class='ui-content'>" +
				"<p>Popup</p>" +
			"</div>",
		element: null,
		timeout: null,

		open: function(selector, options, period){
			var self = this,
				opts;

			if (this.element) return null;

			// selectorは任意指定
			if (typeof selector != "string") {
				period = options;
				options = selector;
				selector = undefined;
			}

			// optionsは任意指定
			if (typeof options != "object") {
				period = options;
				options = {};
			}

			opts = $.extend({}, { transition: "pop" }, options);

			if (selector) {
				this.element = $(selector);
			} else {
				this.element = $(this.defaultHtml);
				if (opts.html) {
					this.element.html(opts.html);
				}
				this.element.appendTo($.mobile.pageContainer.pagecontainer("getActivePage"));
			} 

			this.element
				.popup()
				.popup("open", opts)
				.one("popupafterclose.grist", function(){
					if (selector == undefined) {
						$(this).remove();
					}
					self.element = null;
					clearTimeout(self.timeout);
					self.timeout = null;
				});

			if (period) {
				this.timeout = setTimeout(function(){
					self.close();
				}, period);
			}

			return this;
		},

		close: function(){
			if (this.element) {
				this.element.popup("close");
			}

			return this;
		},

		elem: function(){
			return this.element;
		}
	};
})();

/**
 * 自動デモ
 */
(function(){
	$.grist.m.demo = {
		actionConfig: {
			fast: {
				touchDuration: 0.1 * 1000,
				interval: 0.5
			},
			normal: {
				touchDuration: 0.2 * 1000,
				interval: 1
			},
			slow: {
				touchDuration: 0.4 * 1000,
				interval: 2
			}
		},

		focusClass: "gr-demo-focus",
		scenario: [],

		_defaultAction: {
			event: "click",
			touchDuration: 0.5 * 1000,
			interval: 1
		},
		_step: -1,
		_stepDeferred: null,

		state: function(){
			return this._step < 0 ? "idle" : "running";
		},

		_process: function(){
			var POLLING_INTERVAL = 0.5 * 1000,
				action, target, enclosure,
				dfd = $.Deferred().resolve(),
				self = this;

			if (this._step < 0) return;

			action = $.extend({}, this._defaultAction, this.scenario[this._step++]);
			this._step %= this.scenario.length;

			// メッセージを表示
			if (action.message) {
				dfd = dfd.then(function(){
					$.grist.m.popup.open(action.message, action.interval * 1000);

					self._stepDeferred = $.Deferred(function(dfd){
						setTimeout(dfd.resolve, action.interval * 1000 + 1000);
					});
					return self._stepDeferred;
				});
			}

			// ボタン操作
			else if (action.target) {
				dfd = dfd.then(function(){
					self._stepDeferred = $.Deferred(function(dfd){
						(function findTarget(){
							if (dfd.state() != "pending") return;

							$.each([
								$(".ui-popup-active"),
								$(".ui-panel-open"),
								$("body").pagecontainer("getActivePage"),
								$("body")
							], function(){
								target = this.find(action.target).first();
								if (target.length > 0) return false;
							});
							if (target.length > 0) {
								dfd.resolve();
							} else {
								if (action.optional) {
									dfd.reject("skip");
								} else {
									setTimeout(findTarget, POLLING_INTERVAL);
								}
							}
						})();
					});
					return self._stepDeferred;
				})
				.then(function(){
					var elem;

					elem = target.is(".ui-btn") ? target : target.closest(".ui-btn");
					if (elem.length == 0) {
						elem = target.is("select[data-role=slider]") ? target : target.closest("select[data-role=slider]");
						if (elem.length > 0) {
							elem = elem.next(".ui-slider");
						}
					}
					enclosure = elem.length > 0 ? elem : target;

					// @todo 不要？
					// if (enclosure.closest(".ui-content").length == 0) return;

					self._stepDeferred = $.Deferred(function(dfd){
						var ELEM_MARGIN = 8,
							top, bottom;

						top = enclosure.offset().top - ELEM_MARGIN;
						bottom = enclosure.offset().top + enclosure.outerHeight() + ELEM_MARGIN;
						$.grist.m.reveal(top, bottom).always(function(){
							dfd.resolve();
						});
					});
					return self._stepDeferred;
				})
				.then(function(){
					self._stepDeferred = $.Deferred(function(dfd){
						enclosure.addClass(self.focusClass);
						target.trigger("vmousedown", "grist-demo");
						setTimeout(function(){
							enclosure.removeClass(self.focusClass);
							target.trigger("vmouseup");
							dfd.resolve();
						}, action.touchDuration);
					});
					return self._stepDeferred;
				})
				.then(function(){
					target.trigger(action.event);
					if (target.is("option")) {
						target.prop("selected", true).trigger("change");
					}
					$.grist.log("trigger: " + action.target + " " + action.event);

					self._stepDeferred = $.Deferred(function(dfd){
						setTimeout(function(){
							(function checkLoading(){
								if (dfd.state() != "pending") return;

								if ($(".ui-loading").length == 0) {
									dfd.resolve();
								}

								setTimeout(checkLoading, POLLING_INTERVAL);
							})();
						}, POLLING_INTERVAL);
					});
					return self._stepDeferred;
				})
				.then(function(){
					self._stepDeferred = $.Deferred(function(dfd){
						setTimeout(dfd.resolve, action.interval * 1000 - POLLING_INTERVAL);
					});
					return self._stepDeferred;
				});
			}

			// 遅延
			else if (action.interval) {
				dfd = dfd.then(function(){
					self._stepDeferred = $.Deferred(function(dfd){
						setTimeout(dfd.resolve, action.interval * 1000);
					});
					return self._stepDeferred;
				});
			}

			dfd
				.always(function(){
					self._stepDeferred = null;
				})
				.done(function(){
					self._process();
				})
				.fail(function(reason){
					if (reason == "skip") {
						self._process();
					} else {
						self._step = -1;
					}
				});
		},

		start: function(speed){
			var dfd = $.Deferred(),
				self = this;

			if (this.state() == "running") return dfd.reject().promise();

			$.extend(this._defaultAction, this.actionConfig[speed ? speed : "normal"]);
			this._step = 0;

			$.Deferred().resolve()
				.then(function(){
					self._stepDeferred = $.Deferred(function(dfd){
						setTimeout(dfd.resolve, self._defaultAction.interval);
					});
					return self._stepDeferred;
				})
				.always(function(){
					self._stepDeferred = null;
				})
				.done(function(){
					self._process();
				})
				.fail(function(){
					self._step = -1;
				});

			$(document).on("vmousedown.grist", function(e, param){
				if (param == "grist-demo") return false;

				$(document).off("vmousedown.grist");
				self.stop();
				if ($.grist.m.popup.elem()) {
					$.grist.m.popup.close().elem().one("popupafterclose", function(){
						dfd.resolve();
					});
				} else {
					dfd.resolve();
				}

				return false;
			});

			return dfd.promise();
		},

		stop: function(){
			if (this.state() != "running") return;

			if (this._stepDeferred != null) {
				this._stepDeferred.reject();
			}
		}
	};
})();

/**
 * アプリケーションキャッシュ管理
 */
(function(){
	var appCache = window.applicationCache;

	$(document).one("pageshow", function(){
		var downloading = false;

		if ($.grist.m.appCache.options.showLoading) {
			$(appCache)
				.on("downloading progress", function(){
					if (!downloading) {
						$.grist.m.loading("show", "Downloading");
						downloading = true;
					}
				})
				.on("cached", function(){
					$.grist.m.notify("Download Completed");
				})
				.on("error", function(){
					if (downloading) {
						$.grist.m.notify("ERROR");
					}
				})
				.on("updateready", function(){
					$.grist.m.restart("Updating Application...", 2000);
				})
				.on("cached checking downloading error noupdate obsolete progress updateready", function(e){
					$.grist.log("appCache: " + e.type);
				});
		} else {
			$(appCache)
				.on("downloading progress", function(){
					$("body").removeClassGroup("grist-appcache-").addClass("grist-appcache-downloading");
					downloading = true;
				})
				.on("cached", function(){
					$("body").removeClassGroup("grist-appcache-");
				})
				.on("error", function(){
					if (downloading) {
						$("body").removeClassGroup("grist-appcache-").addClass("grist-appcache-error");
					}
				})
				.on("updateready", function(){
					$("body").removeClassGroup("grist-appcache-").addClass("grist-appcache-ready");
				})
				.on("cached checking downloading error noupdate obsolete progress updateready", function(e){
					$.grist.log("appCache: " + e.type);
				});
		}
	});

	$.grist.m.appCache = {
		options: {
			showLoading: false
		}
	};
})();

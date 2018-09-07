/*! Copyright (c) 2015 RICOH IMAGING COMPANY, LTD. */

"use strict";

/*--------------------------------------------------------------------------*/
function grImages() {
	var images = [],
		anchors = document.getElementsByTagName("a");

	for (var i = 0; i < anchors.length; i++) {
		if (/.*\.jpg/i.test(anchors[i].href) && anchors[i].getAttribute("download") != undefined) {
			images.push(anchors[i].href);
		}
	}

	return images;
}

function extensionTest() {
	console.log(grImages());
}

function grDownloadScheme(filelist) {
	return "gr://cmd/download?fn=" + encodeURIComponent(filelist.join(","));
}

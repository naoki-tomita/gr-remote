import * as React from "react";
import { storage } from "../../models/States/Storage";
import { Directories } from "./Directories";
import { Files } from "./Files";
import { Viewer } from "./Viewer";

export class Images extends React.Component {
  componentDidMount() {
    storage.on("dirs", () => this.forceUpdate());
    storage.on("currentDir", () => this.forceUpdate());
    storage.on("currentFile", () => this.forceUpdate());
    storage.fetchList();
  }
  render() {
    const { dirs } = storage;
    return (
      <>
        <Directories dirs={dirs} />
        {this.renderFilesIfNessesary()}
        {this.renderViewerIfNessesary()}
      </>
    );
  }

  renderFilesIfNessesary() {
    const { currentDir } = storage;
    if (currentDir) {
      return <Files files={currentDir.files} />;
    }
    return null;
  }

  renderViewerIfNessesary() {
    const file = storage.currentFile;
    if (file) {
      return <Viewer file={file.view} />;
    }
    return null;
  }
}

import * as React from "react";
import { device } from "../../models/States/Device";

export class Device extends React.Component {
  componentDidMount() {
    device.on("constants", () => this.forceUpdate());
    device.update();
  }
  render() {
    if (!device.constants) {
      return null;
    }
    const {
      model,
      channelList,
      firmwareVersion,
      macAddress,
      serialNo,
    } = device.constants;
    return (
      <>
        <dl>
          <dt>Model</dt>
          <dd>{model}</dd>
          <dt>ChannelList</dt>
          <dd>{channelList.join(", ")}</dd>
          <dt>FirmwareVersion</dt>
          <dd>{firmwareVersion}</dd>
          <dt>MacAddress</dt>
          <dd>{macAddress}</dd>
          <dt>SerialNumber</dt>
          <dd>{serialNo}</dd>
        </dl>
      </>
    );
  }
}

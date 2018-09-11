import * as React from "react";
import styled from "styled-components";

import { File, storage } from "../../models/States/Storage";

interface Props {
  files: File[];
}

function handleSelect(file: File) {
  storage.currentFile = file;
}

const Flex = styled.div`
  display: flex;
  flex-wrap: wrap;
`;
export const Files: React.StatelessComponent<Props> = ({ files }) => {
  return <Flex>{files.map(renderFile)}</Flex>;
};

const FlexItem = styled.a``;
function renderFile(file: File, i: number) {
  return (
    <FlexItem key={i} onClick={() => handleSelect(file)}>
      <img src={file.thumbnail} />
    </FlexItem>
  );
}

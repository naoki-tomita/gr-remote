import * as React from "react";
import styled from "styled-components";
import { api } from "../../apis";

const FullWidthImage = styled.img`
  display: block;
  width: 100%;
  max-width: 480px;
`;

const Container = styled.div`
  position: relative;
`;

const ThinSheet = styled.div`
  display: inline-block;
`;

const focusLock: React.MouseEventHandler<HTMLDivElement> = e => {
  const x = Math.round(
    ((e.clientX - (e.target as any).x) / (e.target as any).clientWidth) * 100,
  );
  const y = Math.round(
    ((e.clientY - (e.target as any).y) / (e.target as any).clientHeight) * 100,
  );
  api.focus.lock({ x, y });
};

const FocusLocker: React.StatelessComponent = ({ children }) => (
  <ThinSheet onClick={focusLock}>{children}</ThinSheet>
);

export const Preview: React.StatelessComponent = () => (
  <Container>
    <FocusLocker>
      <FullWidthImage src="http://192.168.0.1/v1/display" />
    </FocusLocker>
  </Container>
);

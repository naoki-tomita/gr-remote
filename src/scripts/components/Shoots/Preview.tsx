import * as React from "react";
import styled from "styled-components";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";

import { Shooter } from "./Shooter";

const FullWidthImage = styled.img`
  width: 100%;
  max-width: 640px;
`;

export const Preview: React.StatelessComponent = () => {
  return (
    <>
      <Paper>
        <FullWidthImage src="http://192.168.0.1/v1/display" />
      </Paper>
      <Grid container spacing={8}>
        <Grid item xs={4}>
          <Shooter />
        </Grid>
      </Grid>
    </>
  );
};

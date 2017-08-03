import React from 'react';
import { Page, Section } from 'react-page-layout';

export class About extends React.Component {

    constructor(props) {
        super(props);
    }



    render() {
      return (
        <Page layout="public">
          <Section slot="main">
            <div>
              <h1>About us</h1>
              <h2>BlockTisans Team</h2>
              <img src="/logo.png" />
            </div>
          </Section>
        </Page>
        );
    }
}

export default About;

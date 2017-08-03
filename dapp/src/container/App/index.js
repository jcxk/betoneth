import React from 'react';
import { LayoutProvider } from 'react-page-layout';
import PublicLayout from '../../layout/public';

const layouts = {
  'public': PublicLayout
};


class App extends React.Component {
    render() {
        return (
          <LayoutProvider layouts={layouts}>
            {this.props.children}
          </LayoutProvider>
        );
    }
}

export default App;

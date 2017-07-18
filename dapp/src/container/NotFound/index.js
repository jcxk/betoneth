import React from 'react';
import Helmet from 'react-helmet';

export default class NotFound extends React.Component {

  render() {
    return (
      <div>
        <Helmet title='Not Found' />
        Page was not found
      </div>
    )
  }
}

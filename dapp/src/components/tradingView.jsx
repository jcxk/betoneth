import React from 'react';


export class TradingViewWidget extends React.Component {

  constructor(props) {
    super(props);
  }

  componentDidMount() {

    new window.TradingView.widget({
      "container_id": "tradingWidget",
      "width": this.props.width,
      "height": this.props.height,
      "symbol": "KRAKEN:"+this.props.currency+"EUR",
      "interval": "D",
      "timezone": "Etc/UTC",
      "theme": "White",
      "style": "1",
      "locale": "en",
      "toolbar_bg": "#f1f3f6",
      "enable_publishing": false,
      "allow_symbol_change": false,
      "hideideas": true
    });

  }


  render() {
    return (
      <div id="tradingWidget" />
    );
  }
}

export default TradingViewWidget;

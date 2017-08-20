// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

// Import libraries we need.
import { default as BettingonDApp } from './bettingondapp.js';
import { default as $ } from 'jquery';


window.addEventListener('load', function() {

  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    console.warn("Using web3.currentProvider")
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
    
    alert("Unable to find web3 :(")
    return
  }

  $('ul.tab-nav li a.button').click(function() {
      var href = $(this).attr('href');

      $('li a.active.button', $(this).parent().parent()).removeClass('active');
      $(this).addClass('active');

      $('.tab-pane.active', $(href).parent()).removeClass('active');
      $(href).addClass('active');

      return false;
  });

  window.app = new BettingonDApp()
  window.app.start()

});

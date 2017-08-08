import React, { Component } from 'react';
import { Slot } from 'react-page-layout';

import {AppBar} from 'material-ui';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import Drawer from 'material-ui/Drawer';
import { NavLink } from 'react-router-dom'

import { Container, Divider,Grid, Header, Image, Segment,List, Menu, Dropdown, Button, Table } from 'semantic-ui-react';

class PublicLayout extends Component {
  constructor(props) {
    super(props);
    this.state = {activeItem: 'home'};
  }

  handleItemClick = (e, { name }) => this.setState({ activeItem: name })

  render() {
    const { activeItem } = this.state;
    let winners = _.times(6, (index) => {
      return(
        <Table.Row key={index}>
          <Table.Cell>
            <Header as='h4'>
              <Header.Content>{index}.MRX</Header.Content>
            </Header>
          </Table.Cell>
          <Table.Cell>{_.random(1200)}</Table.Cell>
        </Table.Row>
    )});

    return (
      <div>
        <header>
          <Menu size='massive'>
            <Menu.Item as={NavLink} exact to='/'>Home</Menu.Item>
            <Menu.Item as={NavLink} to='/about'>About</Menu.Item>
            <Menu.Item as={NavLink}  to='/contract'>Contract</Menu.Item>
            <Menu.Menu position='right'>
              <Dropdown item text='CryptoCurrency'>
                <Dropdown.Menu>
                  <Dropdown.Item>ETH</Dropdown.Item>
                  <Dropdown.Item>BITCOIN</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>

              <Menu.Item>
                <Button primary>Sign Up</Button>
              </Menu.Item>
            </Menu.Menu>
          </Menu>
        </header>

        <Grid container stretched  celled >
            <Grid.Column stretched  floated="left" width={11}>
                <Slot name="main" />
            </Grid.Column>
            <Grid.Column  stretched floated="right" width={5} >
              <Grid  stretched>
                  <Grid.Row >
                    <Container >
                      <h1>Ranking</h1>
                      <Table basic='very'>
                        <Table.Header>
                          <Table.Row>
                            <Table.HeaderCell>USER</Table.HeaderCell>
                            <Table.HeaderCell>ETH</Table.HeaderCell>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {winners}
                        </Table.Body>
                      </Table>
                    </Container>
                  </Grid.Row>
                <Grid.Row >
                  <Image centered height="250" width="300" src="http://digitalizedwarfare.com/wp-content/uploads/2017/01/poloniex-trollbox.png" />
                </Grid.Row>
                <Grid.Row >
                  <Image centered height="250" width="300" src="http://www.betterfinanceguru.com/wp-content/uploads/2017/05/Ethereum-Post-Image-featured.png" />
                </Grid.Row>

              </Grid>
            </Grid.Column>
        </Grid>

        <Grid container celled>Footer</Grid>
      </div>
    );
  }
}

export default PublicLayout;

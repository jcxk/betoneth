import React, { Component } from 'react';
import { Slot } from 'react-page-layout';

import {AppBar} from 'material-ui';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import Drawer from 'material-ui/Drawer';
import { NavLink } from 'react-router-dom'

import { Container, Divider,Grid, Header, Image, List, Menu, Dropdown, Button, Table } from 'semantic-ui-react';

class PublicLayout extends Component {
  constructor(props) {
    super(props);
    this.state = {activeItem: 'home'};
  }

  handleItemClick = (e, { name }) => this.setState({ activeItem: name })

  render() {
    const { activeItem } = this.state;
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
              <Grid verticalAlign="top" stretched>
                  <Grid.Row>
                      <h1>Ranking</h1>
                      <Table basic='very'>
                        <Table.Header>
                          <Table.Row>
                            <Table.HeaderCell>USER</Table.HeaderCell>
                            <Table.HeaderCell>ETH</Table.HeaderCell>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>

                          <Table.Row>
                            <Table.Cell>
                              <Header as='h4'>
                               <Header.Content>1.MRX</Header.Content>
                              </Header>
                            </Table.Cell>
                            <Table.Cell>22</Table.Cell>
                          </Table.Row>

                        </Table.Body>
                      </Table>
                  </Grid.Row>
                  <Grid.Row>
                    <h1>Chat</h1>
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

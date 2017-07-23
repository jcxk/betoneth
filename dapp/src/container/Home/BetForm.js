import React, { Component } from 'react';
import { Field, reduxForm } from 'redux-form';

import {
  TextField
} from 'redux-form-material-ui';

const required = value => value == null ? 'Required' : undefined;
const number = value => value && isNaN(Number(value)) ? 'Must be a number' : undefined

export class BetForm extends Component {

  render() {
    const { handleSubmit, submitting } = this.props
    return (
      <form onSubmit={handleSubmit}>
        <div>
          <Field name="expected_value"
            component={TextField}
            hintText="Expected valuesss of eths"
            floatingLabelText="Expected value of eth"
            validate={[required,number]}
            />
        </div>
        <div>
          <button type="submit" disabled={submitting}>Submit</button>
        </div>
      </form>
    )
  }
}

export default reduxForm({
  form: 'betForm'
})(BetForm);

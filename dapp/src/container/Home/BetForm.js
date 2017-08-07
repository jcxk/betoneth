import React, { Component } from 'react';
import { Field, reduxForm } from 'redux-form';

import { Form, Input, Button } from 'semantic-ui-react';

const required = value => value == null ? 'Required' : undefined;
const number = value => value && isNaN(Number(value)) ? 'Must be a number' : undefined

export class BetForm extends Component {



  render() {
    const { handleSubmit, submitting } = this.props;
    const semanticFormField = (
      { input, type, label, placeholder,
        meta: { touched, error, warning },
        as: As = Input, ...props }) => {
      function handleChange (e, { value }) {
        return input.onChange(value);
      }
      return (
        <Form.Field>
          <As {...props} {...input} value={input.value} type={type} label={label} placeholder={placeholder} onChange={handleChange} />
          {touched && ((error && <span><i>{error}</i></span>) || (warning && <span><i>{warning}</i></span>))}
        </Form.Field>
      );
    };
    return (
      <Form name="product" onSubmit={handleSubmit}>

        <Field name="expected_value"
            label="MY BID"
            labelPosition="left"
            component={semanticFormField}
            as={Form.Input}
            placeholder="Expected value of eth"
            validate={[required,number]}
         />
        <Button primary loading={submitting} disabled={submitting}>BET</Button>
      </Form>


    )
  }
}

export default reduxForm({
  form: 'betForm'
})(BetForm);

import React, { Component } from 'react';
import { observer } from 'mobx-react';
const debounce = require('lodash/debounce');

let Row    = require('react-bootstrap/lib/Row');
let Col    = require('react-bootstrap/lib/Col');

import Editor  from './components/Editor.jsx';
import Output    from './components/Output.jsx';
import HeadMenu  from './components/HeadMenu.jsx';
import Footer    from './components/Footer.jsx';
import StatusBar from './components/StatusBar.jsx';

import { parseURL, updateURL } from './utils';

const jsonUtils = require('./jsonUtils');
const presets   = require('./presets/');

import  API   from './API';
import 'babel-polyfill';

import './App.less';

const api = new API(window.config.api);


@observer
class App extends Component {
    componentWillMount() {
        const parsed = parseURL();

        this.props.appState.rules = parsed.rules;
        this.props.appState.input = parsed.input || parsed.data; // Fallback
    }

    componentDidMount() {
        const validateDebounced = debounce(this.validate.bind(this), window.config.debounceInterval);

        this.validateDebounced = () => {
            this.props.appState.status = 'loading';
            this.props.appState.message = 'Waiting for your input...';

            validateDebounced();
        };

        this.validate();
    }

    validate() {
        const data = {};

        ['input', 'rules'].forEach(field => {
            try {
                const parsed = jsonUtils.parse(this.props.appState[field]);

                this.props.appState.fields[field] = '';
                data[field] =  parsed;
            } catch (error) {
                console.log(error);
                this.props.appState.fields[field] = 'error';
            }
        });

        if (data.input === undefined || data.rules === undefined) return;

        this.props.appState.status = 'loading';
        this.props.appState.message = 'Waiting for results...';

        api.validate(data.input, data.rules)
            .then(result => {
                if (!result.status) {
                    this.props.appState.status = 'error';
                    this.props.appState.message = 'Oops! Shit happens!';

                    console.error(result.error);
                    return;
                }

                this.props.appState.status = 'done';
                this.props.appState.message = 'Done!';

                console.log(result);
                this.props.appState.implementations = result.implementations;
            })
            .catch(error => console.error(error, error.stack));
    }

    handleIEditorChange(type, text) {
        this.props.appState[type] = text;
        updateURL(this.props.appState.rules, this.props.appState.input);
        this.validateDebounced();
    }

    handlePresetSelect(preset) {
        this.props.appState.rules = preset.rules;
        this.props.appState.input = preset.input;

        updateURL(this.props.appState.rules, this.props.appState.input);
        this.validateDebounced();
    }

    render() {
        return (
            <div className='App container'>
                <HeadMenu
                    presets={presets}
                    onPresetClick={this.handlePresetSelect.bind(this)}
                />

                <Row>
                    <Col xs={6}>
                        <Editor label='LIVR Rules'
                            value={this.props.appState.rules}
                            bsStyle={this.props.appState.fields.rules}
                            onChange={this.handleIEditorChange.bind(this, 'rules')}
                        />
                    </Col>

                    <Col xs={6}>
                        <Editor
                            label='Data for validation'
                            value={this.props.appState.input}
                            bsStyle={this.props.appState.fields.input}
                            onChange={this.handleIEditorChange.bind(this, 'input')}
                        />
                    </Col>
                </Row>

                <br/>

                <StatusBar
                    status={this.props.appState.status}
                    message={this.props.appState.message}
                />

                <hr/>

                {
                  this.props.appState.implementations.map((implementation, i) =>
                      <Output key={i} implementation={implementation} />
                )}

                <Footer />
            </div>
        );
    }
}

export default App;

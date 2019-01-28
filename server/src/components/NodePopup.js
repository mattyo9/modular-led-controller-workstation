import React from "react";
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import Slider from '@material-ui/lab/Slider';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import FormControl from '@material-ui/core/FormControl'
import FormGroup from '@material-ui/core/FormGroup'
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import FormControlLabel from '@material-ui/core/FormControlLabel'
import FilterGraphService from "../services/FilterGraphService";

import './NodePopup.css'


  
  
  
  const styles = theme => ({
    paper: {
      position: 'absolute',
      top: '350px',
      left: '170px',
      width: theme.spacing.unit * 80,
      backgroundColor: theme.palette.background.paper,
      boxShadow: theme.shadows[5],
      padding: theme.spacing.unit * 4,
      outline: 'none',
    },
  });

class NodePopup extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            mode: props.mode,
            nodeUid: props.nodeUid,
            onSave: props.onSave,
            onCancel: props.onCancel,
            config: {
                parameters: [],
                values: []
            },
            effects: [],
            selectedEffect: null
        }
    }

    componentDidMount() {
        if (this.state.mode === "edit") {
            this.showEdit()
        } else if (this.state.mode === "add") {
            this.showAdd()
        }
    }

    componentWillUnmount() {
        // document.getElementById('node-popUp').style.display = 'none';
    }

    showEdit() {

        const uid = this.state.nodeUid;

        const fetchAndShow = async () => {
            const stateJson = await FilterGraphService.getNode(uid);
            const json = await FilterGraphService.getNodeParameter(uid);
            Promise.all([stateJson, json]).then(result => {
                var effect = result[0]["py/state"]["effect"]["py/state"];
                var values = result[1];
                console.log(effect)
                console.log(values)
                this.setState(state => {
                    return {
                        config: {
                            parameters: values.parameters,
                            values: effect
                        }
                    }
                })
            });
        }
        fetchAndShow();
    }

    showAdd() {

        const fetchEffects = async () => {
            await FilterGraphService.getAllEffects().then(values => {
                let effects = values.map(element => element["py/type"])
                this.setState(state => {
                    return {
                        effects: effects,
                        selectedEffect: effects[0]
                    }
                })
                this.updateNodeArgs(effects[0]);
            }).catch(err => {
                console.error("Error fetching effects:", err);
            })
        }
        fetchEffects();
    }

    async updateNodeArgs(selectedEffect) {
        
        if(selectedEffect == null) {
            return
        }
        const json = await FilterGraphService.getEffectParameters(selectedEffect);
        const defaultJson = await FilterGraphService.getEffectArguments(selectedEffect);

        Promise.all([json, defaultJson]).then(result => {
            var parameters = result[0];
            var defaults = result[1];
            console.log(parameters);
            console.log(defaults);
            return this.setState(state => {
                return {
                    config: {
                        parameters: parameters.parameters,
                        values: defaults
                    }
                }
            })
        }).catch(err => {
            showError("Error updating node configuration. See console for details.");
            console.err("Error updating node configuration:", err);
        });
    }

    handleNodeEditCancel = async (event) => {
        this.state.onCancel()
    }

    handleNodeEditSave = async (event) => {
        var selectedEffect = this.state.selectedEffect;
        var options = this.state.config.values;
        this.state.onSave(selectedEffect, options)
    }

    sortSelect(selElem) {
        var tmpAry = new Array();
        for (var i = 0; i < selElem.options.length; i++) {
            tmpAry[i] = new Array();
            tmpAry[i][0] = selElem.options[i].text;
            tmpAry[i][1] = selElem.options[i].value;
        }
        tmpAry.sort();
        while (selElem.options.length > 0) {
            selElem.options[0] = null;
        }
        for (var i = 0; i < tmpAry.length; i++) {
            var op = new Option(tmpAry[i][0], tmpAry[i][1]);
            selElem.options[i] = op;
        }
        return;
    }

    handleParameterChange = (value, parameter) => {
        let newState = Object.assign({}, this.state);    //creating copy of object
        newState.config.values[parameter] = value;
        if (this.state.mode === "edit") {
            FilterGraphService.updateNode(this.state.nodeUid, { [parameter]: value })
        }
        this.setState(newState);
    };

    handleEffectChange = (effect) => {
        this.setState(state => {
            return {
                selectedEffect: effect
            }
        })
        this.updateNodeArgs(effect);
    }

    render() {
        console.log(this.state)
        const { classes } = this.props;
        let parameters = this.state.config.parameters;
        let values = this.state.config.values;
        let configList = null
        if (parameters) {
            configList = Object.keys(parameters).map((data, index) => {
                let control;
                if (parameters[data] instanceof Array) {
                    if (parameters[data].some(isNaN)) {
                        // Array of non-numbers -> DropDown
                        let items = parameters[data].map((option, idx) => {
                            return (
                                <MenuItem value={option}>{option}</MenuItem>
                            )
                        })
                        control = <React.Fragment>
                            
                            <Grid item xs={9}>
                                <InputLabel htmlFor={data} />
                                <Select
                                    value={values[data]}
                                    onChange={(e, val) => this.handleParameterChange(val.props.value, data)}
                                    inputProps={{
                                        name: data,
                                        id: data,
                                    }}>
                                    {items}
                                </Select>
                            </Grid>
                        </React.Fragment>
                    } else if (!parameters[data].some(isNaN)) {
                        // Array of numbers -> Slider
                        control = <React.Fragment>
                            <Grid item xs={7}>
                                <Slider id={data} value={values[data]} min={parameters[data][1]} max={parameters[data][2]} step={parameters[data][3]} onChange={(e, val) => this.handleParameterChange(val, data)} />
                            </Grid>
                            <Grid item xs={2}>
                                {values[data]}
                            </Grid>
                        </React.Fragment>
                    }
                }
                if (control) {
                    return (
                        
                        <Grid container spacing={24}>
                            <Grid item xs={3}>
                                {data}:
                    </Grid>
                            {control}
                        </Grid>
                    )
                } else {
                    return "undefined"
                }
            });
        }
        let effectDropdown = null;
        if(this.state.mode === 'add') {
            let items = this.state.effects.map((effect, id) => {
                return (
                    <MenuItem value={effect}>{effect}</MenuItem>
                )
            })
            effectDropdown=<React.Fragment>
                <h3>Effects:</h3>
                <InputLabel htmlFor="effect-dropdown" />
            <Select
                value={this.state.selectedEffect}
                onChange={(e, val) => this.handleEffectChange(val.props.value)}
                inputProps={{
                    name: "effect-dropdown",
                    id: "effect-dropdown",
                }}>
                {items}
            </Select>
            </React.Fragment>
        }
        return (
            <div className={classes.paper}>
                <h2 id="node-operation">{this.state.mode}</h2>
                <div id="effects">
                
                    {effectDropdown}
                </div>
                <div id="node-grid">
                <h3>Parameters:</h3>
                    {configList}
                </div>
                <table style={{ margin: "auto" }}>
                    <tbody>
                        <tr>
                            <td><Button variant="contained" id="node-saveButton" onClick={this.handleNodeEditSave}>save</Button></td>
                            <td><Button variant="contained" id="node-cancelButton" onClick={this.handleNodeEditCancel}>cancel</Button></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }
}

NodePopup.propTypes = {
    classes: PropTypes.object.isRequired,
  };

export default withStyles(styles)(NodePopup);
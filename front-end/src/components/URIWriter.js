import React, { Component } from 'react';

const TEMPLATE_TYPE_SELF_MANAGED = 'local MongoDB';
const TEMPLATE_TYPE_REPLICA_SET = 'local MongoDB with replica set';
const TEMPLATE_TYPE_ATLAS_36 = 'Atlas (Cloud) v. 3.6';
const TEMPLATE_TYPE_ATLAS_34 = 'Atlas (Cloud) v. 3.4';
const TEMPLATE_TYPE_ATLAS = 'Atlas (Cloud)';

export default class URIWriter extends Component {
  constructor(props) {
    super(props);
    this.state = {
      atlas: '',
      atlasFormError: false,
      authSource: '',
      database: '',
      hostlist: {
        host0: '',
      },
      replicaSet: '',
      username: '',
    };

    this.handleInputChange = this.handleInputChange.bind(this);
    this.counter = 1;
  }

  handleInputChange(event) {
    const target = event.target;
    const name = target.name;
    const value = target.value;
    const { handleUpdateURIWriter } = this.props;

    if (name === 'atlas') {
      this.setState(
        { [name]: value },
        () => this.parseAtlasString(value, handleUpdateURIWriter)
      );
    } else if (name.includes('host')) {
      this.updateHostlist(name, value, handleUpdateURIWriter);
    } else {
      this.setState(
        { [name]: value },
        () => handleUpdateURIWriter(this.state)
      );
    }
  }

  updateHostlist(name, value, callback) {
    if (value === '' && Object.keys(this.state.hostlist).length > 0) {
      let deletedState = Object.assign({}, this.state.hostlist);
      delete deletedState[name];
      this.setState({ hostlist: deletedState });
    } else {
      this.setState({
        hostlist:
          {
            ...this.state.hostlist,
            [name]: value,
          }
        },
        () => {
          callback(this.state);
          if (!Object.values(this.state.hostlist).includes('')) {
            const newKeyName = `host${this.counter++}`;
            this.setState({
              hostlist:
                {
                  ...this.state.hostlist,
                  [newKeyName]: '',
                }
            });
          }
        }
      );
    }
  }

  clearURI(atlasFormError, callback) {
    this.setState({
      atlasFormError: atlasFormError,
      authSource: '',
      database: '',
      hostlist: {
        host0: '',
      },
      replicaSet: '',
      username: '',
    }, () => callback(this.state));
  }

  parseAtlasString(pastedValue, callback) {
    const atlasString = pastedValue.replace(/[\n\r]+/g, '').trim();

    if (atlasString.indexOf(' --') > -1) {
      return this.parseShell(atlasString, callback);
    }
    if (atlasString.startsWith('mongodb+srv')) {
      return this.parseTo3dot6(atlasString, callback);
    }
    return this.parseTo3dot4(atlasString, callback);
  }

  parseShell(atlasString, callback) {
    // split out the mongo and parse the rest
    const splitOnSpace = atlasString.split(' ');
    let splitOnSpaceClusterEnv = splitOnSpace[1];
    // get rid of double quotes
    splitOnSpaceClusterEnv = splitOnSpaceClusterEnv.replace(/"/g, '');
    // get command line args
    this.parseOutShellParams(splitOnSpace, callback);
    // get the cluster information
    this.parseOutEnvAndClusters(splitOnSpaceClusterEnv, callback);

    // we need to define success
    return true;
  }

  parseTo3dot4(atlasString, callback) {
    const re = /(\S+):\/\/(\S+):(\S*)@(\S+)\/(\S+)\?(\S+)/;
    const matchesArray = atlasString.match(re);
    const isEmptyString = atlasString === '';
    if (!matchesArray) {
      this.clearURI(!isEmptyString, callback);
      return;
    }

    let hostlist= {};
    matchesArray[4].split(',').forEach((host, index) => hostlist[`host${index}`] = host);
    this.setState({
      env: TEMPLATE_TYPE_ATLAS_34,
      username: matchesArray[2],
      hostlist: hostlist,
      database: matchesArray[5],
      ...this.parseURIParams(matchesArray[6]),
    }, () => callback(this.state));
  }

  parseTo3dot6(atlasString, callback) {
    const re = /(\S+):\/\/(\S+):(\S*)@(\S+)\/([^\s?]+)\?/;
    const matchesArray = atlasString.match(re);
    const isEmptyString = atlasString === '';
    if (!matchesArray) {
      this.clearURI(!isEmptyString, callback);
      return;
    }

    const hostlist = { host0: matchesArray[4] };
    this.setState({
      env: TEMPLATE_TYPE_ATLAS_36,
      username: matchesArray[2],
      hostlist: hostlist,
      database: matchesArray[5],
    }, () => callback(this.state));
  }

  parseOutShellParams(splitOnSpace, callback) {
    // go through all of the command line args, parse
    let params = {};
    for (let i = 0; i < splitOnSpace.length; i += 1) {
      if (splitOnSpace[i].startsWith('--')) {
        // this is a key, if next val does not begin with --, its a value
        if (!splitOnSpace[i + 1].startsWith('--')) {
          let splitKey = splitOnSpace[i].replace('--', '');
          let splitValue = splitOnSpace[i + 1];

          if (splitKey === 'authenticationDatabase') {
            splitKey = 'authSource';
          }

          // sometimes the next string is another parameter,
          // ignore those as they are canned
          if (!splitValue.startsWith('--')) {
            // get rid of brackets which can cause problems with our inline code
            splitValue = splitValue.replace('<', '').replace('>', '');
            params[splitKey] = splitValue;
          }
        }
      }
    }
    this.setState({
      ...this.state,
      ...params,
    }, () => callback(this.state));
  }
  
  parseOutEnvAndClusters(splitOnSpaceClusterEnv, callback) {
    // depending on whether this is 3.6 or 3.4 the cluster info looks slightly different
    // 3.4 uses the URI to pass in a replica set name
    let shellMatch = /(\w+):\/\/((\S+)(:)+(\S+))\/(\w+)?\?(\S+)/;
    const shellMatch36 = /((\w+)\+(\w+)):\/\/((\S+))\/(\w+)/;
    if (splitOnSpaceClusterEnv.startsWith('mongodb+srv')) {
      shellMatch = shellMatch36;
    }
    const shellArray = splitOnSpaceClusterEnv.match(shellMatch);
    if (shellArray[1] === 'mongodb') {
      let hostlist= {};
      const hostListString = shellArray[2];
      hostListString.split(',').forEach((host, index) => hostlist[`host${index}`] = host);
      this.setState({
        env: TEMPLATE_TYPE_ATLAS_34,
        database: shellArray[6],
        hostlist: hostlist,
        ...this.parseURIParams(shellArray[7]),
      }, () => callback(this.state));
    } else {
      const hostlist = { host0: shellArray[4] };
      this.setState({
        env: TEMPLATE_TYPE_ATLAS_36,
        database: shellArray[6],
        hostlist: hostlist,
      }, () => callback(this.state));
    }
  }

  parseURIParams(shellString) {
    const params = {};
    shellString.split('&').forEach(param => {
      const [key, value] = param.split('=');
      params[key] = value;
    });
    return params;
  }

  render() {
    const { templateType } = this.props;
    const { atlasFormError, hostlist } = this.state;
    const isAtlas = templateType.includes(TEMPLATE_TYPE_ATLAS);

    return (
      <form className="uriwriter__form" id="uriwriter" autoComplete="off">
        {isAtlas ? (
          <label className="mongodb-form__prompt">
            <span className="mongodb-form__label">Atlas Connection String</span>
            <textarea
              name="atlas"
              type="text"
              value={this.state.atlas}
              onChange={this.handleInputChange}
              rows="3"
              style={{width: '100%'}}
              className={`mongodb-form__input ${atlasFormError ? 'mongodb-form__status--invalid' : ''}`} />
          </label>
        ) : (
          <React.Fragment>
            <label className="mongodb-form__prompt">
              <span className="mongodb-form__label">Username</span>
              <input
                name="username"
                type="text"
                value={this.state.username}
                onChange={this.handleInputChange}
                className="mongodb-form__input" />
            </label>
            <label className="mongodb-form__prompt">
              <span className="mongodb-form__label">Database Name</span>
              <input
                name="database"
                type="text"
                value={this.state.database}
                onChange={this.handleInputChange}
                className="mongodb-form__input" />
            </label>
            {templateType === TEMPLATE_TYPE_REPLICA_SET && (
              <label className="mongodb-form__prompt">
                <span className="mongodb-form__label">replicaSet</span>
                <input
                  name="replicaSet"
                  type="text"
                  value={this.state.replicaSet}
                  onChange={this.handleInputChange}
                  className="mongodb-form__input" />
              </label>
            )}
            <label className="mongodb-form__prompt">
              <span className="mongodb-form__label">authSource</span>
              <input
                name="authSource"
                type="text"
                value={this.state.authSource}
                onChange={this.handleInputChange}
                className="mongodb-form__input" />
            </label>
            <label className="mongodb-form__prompt">
              <span className="mongodb-form__label">Servers</span>
              <div style={{display: 'flex', flexDirection: 'column'}}>
              {Object.entries(hostlist).map(([key, value]) => (
                <input
                  name={key}
                  key={key}
                  type="text"
                  value={hostlist[key]}
                  onChange={this.handleInputChange}
                  className="mongodb-form__input" />
              ))}
              </div>
            </label>
          </React.Fragment>
        )}
      </form>
    );
  }
}

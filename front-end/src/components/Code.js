import React, { Component } from 'react';

const TEMPLATE_TYPE_SELF_MANAGED = 'local MongoDB';
const TEMPLATE_TYPE_REPLICA_SET = 'local MongoDB with replica set';
const TEMPLATE_TYPE_ATLAS_36 = 'Atlas (Cloud) v. 3.6';
const TEMPLATE_TYPE_ATLAS_34 = 'Atlas (Cloud) v. 3.4';
const TEMPLATE_TYPE_ATLAS = 'Atlas (Cloud)';

const URI_PLACEHOLDER = '<URISTRING>';
const USERNAME_PLACEHOLDER = '<USERNAME>';
const URISTRING_SHELL_PLACEHOLDER = '<URISTRING_SHELL>';
const URISTRING_SHELL_NOUSER_PLACEHOLDER = '<URISTRING_SHELL_NOUSER>';

const TEMPLATE_OPTIONS = {
  [TEMPLATE_TYPE_SELF_MANAGED]: [
    {
      name: 'authSource',
      type: 'text'
    }
  ],
  [TEMPLATE_TYPE_REPLICA_SET]: [
    {
      name: 'replicaSet',
      type: 'text'
    },
    {
      name: 'authSource',
      type: 'text'
    },
    {
      name: 'ssl',
      type: 'pass-through',
      value: 'true'
    }
  ],
  [TEMPLATE_TYPE_ATLAS_36]: [],
  [TEMPLATE_TYPE_ATLAS_34]: [
    {
      name: 'replicaSet',
      type: 'text'
    },
    {
      name: 'authSource',
      type: 'text'
    },
    {
      name: 'ssl',
      type: 'pass-through',
      value: 'true'
    }
  ],
}

const optionStringifier = (options, uri) => {
  const paramJoinCharacter = '&';
  let optionParams = [];
  options.forEach(({ name, type, value }) => {
    let paramValue = uri[name];
    if (!paramValue) {
      paramValue = type === 'pass-through' ? value : (uri[name] || `$[${name}]`);
    }
    optionParams.push(`${name}=${paramValue}`)
  });
  return optionParams.join(paramJoinCharacter);
}

const generateURI = (uri, templateName, templateType) => {
  const username = uri.username || '$[username]';
  const hostlist = uri.hostlist ? Object.values(uri.hostlist).slice(0, -1) : '$[hostlist]';
  const authSource = uri.authSource || '$[authSource]';
  const database = uri.database || '$[database]';
  const replicaSet = uri.replicaSet || '$[replicaSet]';
  const options = optionStringifier(TEMPLATE_OPTIONS[templateName], uri);

  const TEMPLATES = {
    [TEMPLATE_TYPE_SELF_MANAGED]: {
      template: `mongodb://${username}:$[password]@${hostlist}/${database}?${options}`,
      templatePasswordRedactedShell: `mongodb://${hostlist}/${database}?${options} --username ${username}`,
      templateShell: `mongodb://${username}:$[password]@${hostlist}/${database}?${options}`,
    },
    [TEMPLATE_TYPE_REPLICA_SET]: {
      template: `mongodb://${username}:$[password]@${hostlist}/${database}?${options}`,
      templatePasswordRedactedShell: `mongodb://${hostlist}/${database}?${options} --username ${username} --password`,
      templateShell: `mongodb://${username}:$[password]@${hostlist}/${database}?${options}`,
    },
    [TEMPLATE_TYPE_ATLAS_36]: {
      template: `mongodb://${username}:$[password]@${hostlist}/${database}?retryWrites=true`,
      templatePasswordRedactedShell: `mongodb+srv://${hostlist}/${database} --username ${username} --password`,
      templateShell: `mongodb+srv://${username}:$[password]@${hostlist}/${database}`,
    },
    [TEMPLATE_TYPE_ATLAS_34]: {
        template: `mongodb://${username}:$[password]@${hostlist}/${database}?${options}`,
        templatePasswordRedactedShell: `mongodb://${hostlist}/${database}?replicaSet=${replicaSet} --ssl --authenticationDatabase ${authSource} --username ${username} --password`,
        templateShell: `mongodb://${hostlist}/${database}?replicaSet=${replicaSet} --ssl --authenticationDatabase ${authSource} --username ${username} --password $[password]`,
    }
  };

  return TEMPLATES[templateName][templateType];
}

export default class Code extends Component {
  replacePlaceholderWithURI(codeblock) {
    const { templateType, uri } = this.props;

    return codeblock
      .replace(URI_PLACEHOLDER, generateURI(uri, templateType, 'template'))
      .replace(USERNAME_PLACEHOLDER, uri.username || '$[username]')
      .replace(URISTRING_SHELL_PLACEHOLDER, generateURI(uri, templateType, 'templateShell'))
      .replace(URISTRING_SHELL_NOUSER_PLACEHOLDER, generateURI(uri, templateType, 'templatePasswordRedactedShell'));
  }

  render() {
    const { value } = this.props.nodeData

    return (
      <div className="button-code-block">
        <div className="button-row">
          <a className="code-button--copy code-button" role="button">copy<div className="code-button__tooltip code-button__tooltip--inactive">copied</div></a>
        </div>
        <div className="copyable-code-block highlight-python notranslate">
          <div className="highlight">
            <pre>
              { this.replacePlaceholderWithURI(value) }
            </pre>
          </div>
        </div>
      </div>
    )
  }

}

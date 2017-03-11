# nci docker node

Docker node for [nci](https://github.com/node-ci/nci).

This plugin allows to execute build in docker container.

[![Build Status](https://travis-ci.org/node-ci/nci-docker-node.svg?branch=master)](https://travis-ci.org/node-ci/nci-docker-node)


## nci host requirements

This plugins requires only docker client which should accessible as `docker` command
for user from which nci was started.


## Remote host requirements

* running docker server


## Docker image requirements

* git client >= 1.9 (only for building git projects)
* mercurial client >= 2.8 (only for building mercurial projects)


## Installation

```sh
npm install nci-docker-node
```

## Usage

Add this plugin to the `plugins` section at server config, configure specific
node by adding it to `nodes` section e.g. (with yaml config):

```yaml

plugins:
    - nci-docker-node

nodes:
    - type: docker
      name: localDocker
      usageStrategy: specificProject
      maxExecutorsCount: 2
      envs:
          - !!js/regexp .*
      options:
          host: unix:///var/run/docker.sock
          defaultEnv: node:4
```

After that `localDocker` node will be used for building projects
according to `usageStrategy`. During build nci will send commands
(using docker client) to docker instance at `options.host`. "node:4" image
will be used by default, any other image (```envs``` allows any) name
can be passed from project (project can specify target ```envs```).

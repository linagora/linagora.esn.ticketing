# Command Line Interface

From the root directory:

```bash
$ node ./bin/cli --help
```

## Commands

### Elasticsearch

**Setup**

It will create the indexes on the elasticsearch instance defined from CLI options.

```bash
$ node ./bin/cli elasticsearch setup --host localhost --port 9200 --type organizations
```

- host: default is localhost
- port: default is 9200
- type: Defines the type of index to create. Possible values: organizations, software, contracts. When not set, it will create all the required indexes.

**Reindex**

It will index or reindex data from the DB to ES.

```bash
$ node ./bin/cli elasticsearch reindex --host localhost --port 9200 --type organizations
```

- host: default is localhost
- port: default is 9200
- type: the data type to reindex. Possible values: organizations, software, contracts


### Role

It will set role for user which user email and role are defined from CLI options.

```bash
$ node ./bin/cli role --email user@mail.com --role administrator
```

- --email, -e  user email                           
- --role, -r   expectation role, choices: "administrator", "user"

'use strict';

module.exports = function(dependencies) {

  const models = require('./db')(dependencies);
  const client = require('./client')(dependencies);

  return {
    client,
    models
  };
};
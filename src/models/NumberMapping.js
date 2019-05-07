/*
 * Copyright 2019 The BitcoinZ Project
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to
 * do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 * OR COPYRIGHTHOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
const Base = require('./Base');
const joi = require('joi');
const uuid = require('uuid');
const { omit } = require('lodash');

const NumberMappingModel = Base.extend({
  tableName: 'numberMapping',
  uuid: true,
  hasTimestamps: ['createdAt', 'updatedAt'],
  schema: joi.object().keys({
    id: joi.string().uuid().required(),
    number: joi.string().min(2).required(),
    address: joi.string().alphanum().min(10).required(),
    createdAt: joi.date().required(),
    updatedAt: joi.date().required(),
  }),

  initialize() {
    Base.prototype.initialize.call(this);
  },
});

module.exports = NumberMappingModel;

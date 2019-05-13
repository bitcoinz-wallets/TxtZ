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
const joi = require('joi');
const uuid = require('uuid');
const bookshelf = require('../lib/bookshelf');

const BaseModel = bookshelf.Model.extend({
  schema: joi.object().keys({}),

  initialize() {
    this.on('creating', this.addId);
    this.on('saving', this.validateSave);
  },

  addId(model) {
    const id = model.get(model.idAttribute);
    if (this.uuid && !id) {
      model.set({ id: uuid.v4() });
    }
  },

  validateSave() {
    return joi.validate(this.attributes, this.schema, (err) => {
      if (err) {
        throw new Error(err);
      }
    });
  },

  update(params) {
    this.set(params);
    return this.save();
  },
}, {
  create(params) {
    return this.forge(params).save();
  },

  destroyAll() {
    return this.query().delete();
  },
});

module.exports = BaseModel;

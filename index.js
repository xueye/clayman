/// <reference path="./typings/node/node.d.ts"/>
var postcss = require('postcss');
var Clayman;
(function (Clayman) {
    function getAllSelectors(selector) {
        if (!selector)
            throw new ArgumentNullException("selector");
        return selector.split(",").map(function (selector) {
            return selector.trim();
        });
    }
    var ArgumentNullException = (function () {
        /**
         * An error thrown indicating that an argument was null that should not be able to be null
         *
         * @class ArgumentNullException
         * @param {String} argName Name of the argument that could not be null
         * @constructor
         */
        function ArgumentNullException(argName) {
            this.argName = argName;
            /**
             * Name of the exception
             *
             * @property name
             * @type String
             */
            this.name = "ArgumentNullException";
            /**
             * The error message
             *
             * @property message
             * @type String
             */
            this.message = "";
            this.message = "Argument " + argName + " cannot be null";
        }
        return ArgumentNullException;
    })();
    var SelectorRuleSet = (function () {
        /**
         * A set of rules for a particular CSS selector
         *
         * @class SelectorRuleSet
         * @param {String} selector The name of the CSS selector
         * @param {String} parent_identifier An identifier used to represent the parent of this CSS ruleset; ie, a media query
         * @constructor
         */
        function SelectorRuleSet(selector, parent_identifier) {
            /**
             * An identifier used to identify this selector rule set that will be composed by selectors, media queries, etc
             *
             * @property parent_identifier
             * @type string
             */
            this.parent_identifier = "";
            /**
             * The CSS Selector applying to this rule set
             *
             * @property selector
             * @type string
             */
            this.selector = "";
            /**
             * The has to determine the uniqueness of the styles for this selector / rule set
             *
             * @property hash
             * @private
             * @type String
             */
            this.hash = "";
            /**
             * Set of rules representing the styles and their associated values
             *
             * @property rules
             * @type Object
             */
            this.rules = {};
            this.selector = selector;
            this.parent_identifier = parent_identifier;
        }
        /**
         * Gets the hash identifying this selector's rules, so uniqueness can be determined
         *
         * @param {String} property The property name
         * @param {String} value The value
         * @method addRule
         * @return {String} The hash
         */
        SelectorRuleSet.prototype.addRule = function (property, value) {
            if (!property)
                throw new ArgumentNullException("property");
            if (!value)
                throw new ArgumentNullException("value");
            var needsHashRegen = this.rules[property] !== value;
            this.rules[property] = value;
            if (needsHashRegen) {
                this.generateHash();
            }
        };
        /**
         * Gets the CSS rule for a property
         *
         * @param {String} property The property name
         * @method getRule
         * @return {String} The rule
         */
        SelectorRuleSet.prototype.getRule = function (property) {
            return this.rules[property];
        };
        /**
         * Gets the hash identifying this selector's rules, so uniqueness can be determined
         *
         * @method getHash
         * @return {String} The hash
         */
        SelectorRuleSet.prototype.getHash = function () {
            return this.hash;
        };
        /**
         * Generates the hash identifying this selector's rules, so uniqueness can be determined
         *
         * @method generateHash
         * @return {String} The hash
         */
        SelectorRuleSet.prototype.generateHash = function () {
            var _this = this;
            var orderedKeys = Object.keys(this.rules).sort();
            var newHash = "";
            orderedKeys.forEach(function (ruleKey) {
                newHash += ruleKey + ":" + _this.rules[ruleKey] + "|";
            });
            this.hash = newHash;
            return newHash;
        };
        /**
         * Displays the rule set as a css string
         *
         * @method toString
         * @return {String} The result
         */
        SelectorRuleSet.prototype.toString = function () {
            var ruleKeys = Object.keys(this.rules);
            if (ruleKeys.length === 0)
                return "";
            var ret = this.selector + " {\n";
            ret += this.bodyString();
            ret += "\n}";
            return ret;
        };
        /**
         * Convenience function that returns the body of the CSS block as a string
         *
         * @method bodyString
         * @return {String} The result
         */
        SelectorRuleSet.prototype.bodyString = function () {
            var _this = this;
            var ruleKeys = Object.keys(this.rules);
            if (ruleKeys.length === 0)
                return "";
            return ruleKeys.map(function (ruleKey) {
                return "\t" + ruleKey + ": " + _this.rules[ruleKey] + ";";
            }).join("\n");
        };
        return SelectorRuleSet;
    })();
    var StyleSheet = (function () {
        /**
         * A Representation of a StyleSheet
         *
         * @class StyleSheet
         * @constructor
         */
        function StyleSheet() {
            this.selectors = {};
        }
        /**
         * Outputs the plaintext representing the StyleSheet
         *
         * @method toString
         * @return {String} The result
         */
        StyleSheet.prototype.toString = function () {
            var _this = this;
            var keys = Object.keys(this.selectors);
            var ret = "";
            var identifierDict = {};
            keys.forEach(function (key) {
                var currSelector = _this.selectors[key];
                if (!identifierDict[currSelector.parent_identifier]) {
                    identifierDict[currSelector.parent_identifier] = [];
                }
                var currentArray = identifierDict[currSelector.parent_identifier];
                currentArray.push(currSelector);
            });
            var identifierDictKeys = Object.keys(identifierDict);
            identifierDictKeys.forEach(function (identifierKey) {
                var hashGroups = {};
                identifierDict[identifierKey].forEach(function (rule) {
                    var hash = rule.getHash();
                    if (hashGroups[hash]) {
                        hashGroups[hash].push(rule);
                    }
                    else {
                        hashGroups[hash] = [rule];
                    }
                });
                var currList = Object.keys(hashGroups).map(function (groupKey) {
                    var group = hashGroups[groupKey];
                    var newSelector = group.map(function (entry) {
                        return entry.selector;
                    }).join(", ");
                    var ret = newSelector + " {\n";
                    ret += group[0].bodyString();
                    ret += "\n}";
                    return ret;
                }).filter(function (ruleStr) {
                    return !!ruleStr;
                });
                if (currList.length === 0)
                    return;
                var indent = false;
                if (identifierKey) {
                    indent = true;
                    ret += "\n@" + identifierKey + "{\n";
                }
                var ruleStringsJoined = currList.map(function (entry) {
                    return entry;
                }).join("\n\n");
                if (indent) {
                    // add a tab
                    ruleStringsJoined = ruleStringsJoined.replace(/(^|\n)/g, '$1\t');
                }
                ret += ruleStringsJoined;
                if (identifierKey) {
                    ret += "\n}\n";
                }
            });
            return ret;
        };
        /**
         * Adds a set of rules to the StyleSheet
         *
         * @param {String} selector The CSS Selector
         * @param {String} parentIdentifier A way to identify the parent (root, media query, etc)
         * @param {Array} declarations An array of style declarations
         * @method addRuleSet
         */
        StyleSheet.prototype.addRuleSet = function (selector, parentIdentifier, declarations) {
            var identifier = (parentIdentifier ? parentIdentifier + "|" : '') + selector;
            if (!this.selectors[identifier]) {
                this.selectors[identifier] = new SelectorRuleSet(selector, parentIdentifier);
            }
            var ruleSet = this.selectors[identifier];
            declarations.forEach(function (declaration) {
                ruleSet.addRule(declaration.prop, declaration.value);
            });
        };
        /**
         * Convenience Function; adds a node from parsecss to the stylesheet
         *
         * @param {Object} node The parseCSS node
         * @method addNode
         */
        StyleSheet.prototype.addNode = function (node) {
            var _this = this;
            var selectors = getAllSelectors(node.selector);
            var declarations = node.nodes.filter(function (node) {
                return node.type === 'decl';
            });
            var parentIdentifier = "";
            if (node.parent.type === 'atrule') {
                parentIdentifier = node.parent.name + " " + node.parent.params;
            }
            selectors.forEach(function (selector) {
                _this.addRuleSet(selector, parentIdentifier, declarations);
            });
        };
        /**
         * Creates a new StyleSheet containing the difference between the current StyleSheet and another StyleSheet.
         *
         * @param {StyleSheet} other The StyleSheet to extract a difference against
         * @method difference
         * @return {StyleSheet} A StyleSheet representing the difference
         */
        StyleSheet.prototype.difference = function (other) {
            var _this = this;
            if (!other)
                throw new ArgumentNullException("other");
            var ret = new StyleSheet();
            // We look for entire rules that other has that this stylesheet doesnot
            // We look for rules that they share, where there are new rules in other
            Object.keys(other.selectors).forEach(function (key) {
                if (!_this.selectors[key]) {
                    // we need to add it because `other` has something new
                    var ruleSet = other.selectors[key];
                    var rules = Object.keys(ruleSet.rules).map(function (rule) {
                        return { prop: rule, value: ruleSet.rules[rule] };
                    });
                    ret.addRuleSet(ruleSet.selector, ruleSet.parent_identifier, rules);
                }
                else {
                    // ignore rules where they are shared
                    // if all rules are shared, ignore elements
                    // only add rules where they are different
                    var baseSet = _this.selectors[key];
                    var otherSet = other.selectors[key];
                    var newRules = [];
                    Object.keys(otherSet.rules).forEach(function (rule) {
                        if (baseSet.rules[rule] !== otherSet.rules[rule]) {
                            newRules.push({ prop: rule, value: otherSet.rules[rule] });
                        }
                    });
                    if (newRules.length > 0) {
                        ret.addRuleSet(baseSet.selector, baseSet.parent_identifier, newRules);
                    }
                }
            });
            return ret;
        };
        /**
         * Creates a new StyleSheet containing the combined properties and rules of the current StyleSheet and another.
         *
         * @param {StyleSheet} other The other StyleSheet
         * @method merge
         * @return {StyleSheet} A StyleSheet representing the union of the two
         */
        StyleSheet.prototype.merge = function (other) {
            var _this = this;
            if (!other)
                throw new ArgumentNullException("other");
            var ret = new StyleSheet();
            Object.keys(this.selectors).forEach(function (key) {
                var ruleSet = _this.selectors[key];
                var rules = Object.keys(ruleSet.rules).map(function (rule) {
                    return { prop: rule, value: ruleSet.rules[rule] };
                });
                ret.addRuleSet(ruleSet.selector, ruleSet.parent_identifier, rules);
            });
            Object.keys(other.selectors).forEach(function (key) {
                var ruleSet = other.selectors[key];
                var rules = Object.keys(ruleSet.rules).map(function (rule) {
                    return { prop: rule, value: ruleSet.rules[rule] };
                });
                ret.addRuleSet(ruleSet.selector, ruleSet.parent_identifier, rules);
            });
            return ret;
        };
        /**
         * Adds a namespace to the CSS selector; ie, given namespace `ns`, html -> html.ns, body -> .ns body { }
         *
         * @param {string} ns The namespace
         * @method namespace
         * @return {StyleSheet} Returns self
         */
        StyleSheet.prototype.namespace = function (ns) {
            var _this = this;
            if (!ns)
                throw new ArgumentNullException("ns");
            // If they just give a string, treat it as a class
            if (ns.indexOf(".") !== 0 && ns.indexOf("#") !== 0)
                ns = "." + ns;
            var keys = Object.keys(this.selectors);
            var makeNewSelector = function (selector) {
                var newSelector = "";
                // If it starts with html, rewrite accordingly
                if (selector.indexOf("html") === 0) {
                    newSelector = "html" + ns + selector.slice(4);
                }
                else {
                    newSelector = ns + " " + selector;
                }
                return newSelector;
            };
            keys.forEach(function (key) {
                var curr = _this.selectors[key];
                var newKey = makeNewSelector(key);
                _this.selectors[newKey] = _this.selectors[key];
                curr.selector = makeNewSelector(curr.selector);
                delete _this.selectors[key];
            });
            return this;
        };
        return StyleSheet;
    })();
    var Base = (function () {
        /**
         * The main class of Clayman
         *
         * @class Clayman
         * @param {PostCSS} postcss An instance of PostCSS
         * @constructor
         */
        function Base(postcss) {
            this.postcss = postcss;
        }
        /**
         * Takes two or more StyleSheets and returns a difference of their rules in a Clayman StyleSheet
         *
         * @method difference
         * @param {Array} sources An array of strings representing CSS Stylesheets
         * @return {StyleSheet} Returns a ClaymanStylesheet representing the difference
         * between the base and all other stylesheets
         */
        Base.prototype.difference = function () {
            var _this = this;
            var sources = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                sources[_i - 0] = arguments[_i];
            }
            if (sources.length == 0)
                throw Error("Must supply at least one source");
            var claymanSources = sources.map(function (source) {
                return _this.compact(source);
            });
            var base = claymanSources[0];
            var others = claymanSources.slice(1);
            var othersMerged = others.reduce(function (prev, curr) {
                return prev.merge(curr);
            });
            var diff = base.difference(othersMerged);
            return diff;
        };
        /**
         * Takes a CSS string and converts it into a compacted Clayman StyleSheet
         *
         * @method compact
         * @param {String} source A string representing CSS styles
         * @return {StyleSheet} A Clayman StyleSheet of the source
         */
        Base.prototype.compact = function (source) {
            var compacted = this.postcss.parse(source);
            // We flatten out into one node array
            var nodes = [];
            var nodeDump = function (node) {
                if (node.type === 'rule') {
                    nodes.push(node);
                }
                else if (node.type === 'atrule') {
                    node.nodes.forEach(nodeDump);
                }
            };
            compacted.nodes.forEach(nodeDump);
            var stylesheet = new StyleSheet();
            nodes.forEach(function (node) {
                stylesheet.addNode(node);
            });
            return stylesheet;
        };
        /**
         * Takes a CSS string and converts it into a compacted Clayman StyleSheet; convenience function that calls compact
         *
         * @method from
         * @param {String} source A string representing CSS styles
         * @return {StyleSheet} A Clayman StyleSheet of the source
         */
        Base.prototype.from = function (source) {
            return this.compact(source);
        };
        /**
         * Takes a CSS selector string (ie: ".foo, span.bar") and extracts all the individual selectors from it.
         *
         * @method getAllSelectors
         * @throws {Error} Cannot parse null selector or empty selector
         * @param {String} source A string representing any number of CSS selectors
         * @return {Array} Returns an array of strings with the selector names
         */
        Base.prototype.getAllSelectors = function (selector) {
            return getAllSelectors(selector);
        };
        return Base;
    })();
    Clayman.Base = Base;
})(Clayman || (Clayman = {}));
module.exports = new Clayman.Base(postcss);

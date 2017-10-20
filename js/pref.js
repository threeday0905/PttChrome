import { i18n, getLang } from './i18n';
import { AboutPane } from './pref_about';

export function PttChromePref(app, onInitializedCallback) {
  this.values = {};
  this.app = app;
  this.shouldResetToDefault = false;

  this.enableBlacklist = false;
  this.blacklistedUserIds = {};

  this.quickSearches = [];

  //this.loadDefault(onInitializedCallback);
  this.onInitializedCallback = onInitializedCallback;
  this.initCallbackCalled = false;
}

PttChromePref.prototype = {

  updateSettingsToUi: function() {
    this.refreshBlacklistOnUi();

    var self = this;
    var htmlStr = '';
    var n = 0;
    var onMouseBrowsingHighlightColorChange = function(e) {
      var qName = '#opt_mouseBrowsingHighlightColor';
      var val = $(qName+' select').val();
      var bg = $(qName+' .b'+val).css('background-color');
      $(qName+' select').css('background-color', bg);
    };

    for (var i in this.values) {
      $('#opt_'+i).empty();
      var val = this.values[i];

      // for blacklisted userids 
      if (i === 'blacklistedUserIds') {
        continue;
      }
      if (i === 'quickSearchList') {
        this.setupQuickSearchUiList();
        this.setupQuickSearchUiHandlers();
        continue;
      }

      if (i === 'deleteDupLogin') {
        var yesNode = $('#opt_deleteDupLoginYes');
        if (val) {
          yesNode.click();
        }
        continue;
      }
      
      // for the color selection box
      if (i === 'mouseBrowsingHighlightColor') {
        var qName = '#opt_'+i;
        htmlStr = i18n('options_highlightColor')+'<select class="form-control">';
        for (n = 1; n < 16; ++n) {
          htmlStr += '<option value="'+n+'" class="b'+n+'"></option>';
        }
        htmlStr += '</select>';
        $(qName).html(htmlStr);
        $(qName+' select').val(val);
        var bg = $(qName+' .b'+val).css('background-color');
        $(qName+' select').css('background-color', bg);
        $(qName+' select').on('change', onMouseBrowsingHighlightColorChange);
        continue;
      }

      // for options that's predefined
      if (i in PREF_OPTIONS) {
        var optName = '#opt_'+i;
        htmlStr = i18n('options_'+i) + '<select class="form-control">';
        var options = PREF_OPTIONS[i];
        for (n = 0; n < options.length; ++n) {
          htmlStr += '<option value="'+n+'">'+i18n(options[n])+'</option>';
        }
        htmlStr += '</select>';
        $(optName).html(htmlStr);
        if (typeof(val) == 'boolean') {
          val = val ? 1:0;
        }
        $(optName+' select').val(val);

        continue;
      }

      var popoverTooltips = '';
      if (i == 'fontFace' || i == 'antiIdleTime') {
        popoverTooltips = ' data-toggle="popover" data-trigger="focus" data-content="'+i18n('tooltip_'+i)+'"';
      }

      switch(typeof(val)) {
        case 'number':
          $('#opt_'+i).html(
            '<label style="font-weight:normal;">'+i18n('options_'+i)+'</label>'+
            '<input type="number" class="form-control" value="'+val+'"'+popoverTooltips+'>');
          break;
        case 'string':
          $('#opt_'+i).html(
            '<label style="font-weight:normal;">'+i18n('options_'+i)+'</label>'+
            '<input type="text" class="form-control" value="'+val+'"'+popoverTooltips+'>');
          break;
        case 'boolean':
          $('#opt_'+i).html(
            '<label><input type="checkbox" '+(val?'checked':'')+'>'+i18n('options_'+i)+'</label>');
          break;
        default:
          break;
      }

      // init popovers
      if (i == 'fontFace' || i == 'antiIdleTime') {
        $('#opt_'+i+' input').popover();
      }
    }
  },

  setupSettingsUi: function() {
    var self = this;
    var i;
    $('#opt_title').text(i18n('menu_settings'));

    $('#opt_reset').off();
    $('#opt_reset').text(i18n('options_reset'));
    $('#opt_reset').click(function() {
      self.shouldResetToDefault = true;
      $('#prefModal').modal('hide');
    });
    // adjust the size alittle according to the locale
    var lang = getLang();
    if (lang == 'en_US') {
      $('#opt_reset').css('fontSize', '12px');
      $('#opt_reset').css('marginLeft', '-10px');
    }

    var cat = '';
    for (i in PREFS_CATEGORIES) {
      cat = PREFS_CATEGORIES[i];
      $('#opt_'+cat).text(i18n('options_'+cat));
    }
    for (i in PREFS_NAV) {
      cat = PREFS_NAV[i];
      $('#optNav_'+cat).text(i18n('options_'+cat));
    }

    $('#opt_tabs a:first').tab('show');
    var currTab = 'general';
    $('#modalHeader').text(i18n('options_'+currTab));

    // blacklist
    $('#opt_blacklistInstruction').text(i18n('options_blacklistInstruction'));

    this.setupExtensionsPage();

    this.setupAboutPage();
    
    $('#opt_tabs a').click(function(e) {
      e.preventDefault();

      var currTab = $(this).attr('name');
      $('#modalHeader').text(i18n('options_'+currTab));
      $(this).tab('show');
    });
  },

  populateSettingsToUi: function() {
    var self = this;
    this.setupSettingsUi();
    this.updateSettingsToUi();

    $('#prefModal').off();
    $('#prefModal').on('show.bs.modal', function(e) {
      var width = document.documentElement.clientWidth * 0.7;
      width = (width > 730) ? width : 730;
      width -= 190;
      var height = document.documentElement.clientHeight * 0.9;
      height = (height > 400) ? height: 400;
      height -= 76;
      $('#prefModal .modal-body').css('height', height + 'px');
      $('#prefModal .modal-body').css('width', width + 'px');
      $('#opt_blacklistedUsers').css('height', height-150 + 'px');
      self.refreshBlacklistOnUi();
    });
    $('#prefModal').on('shown.bs.modal', function(e) {
      self.app.disableLiveHelper();
      self.app.modalShown = true;
    });
    $('#prefModal').on('hidden.bs.modal', function(e) {
      if (self.shouldResetToDefault) {
        self.clearStorage();
        self.values = JSON.parse(JSON.stringify(DEFAULT_PREFS));
        self.blacklistedUserIds = {};
        self.quickSearches = JSON.parse(DEFAULT_PREFS.quickSearchList);
        self.updateSettingsToUi();
        self.app.view.redraw(true);

        self.shouldResetToDefault = false;
      } else {
        self.readValueFromUi();
      }
      self.saveAndDoneWithIt();
      self.app.switchToEasyReadingMode(self.app.view.useEasyReadingMode);
    });
  },

  setupQuickSearchUiList: function() {
    var self = this;
    $('#ext_quickSearch').text(i18n('ext_quickSearch'));
    var addNewSearchHtml = '<input type="text" class="form-control qSearchItemName" placeholder="' + i18n('ext_addQuickSearchNamePlaceholder') + '" /><input type="text" class="form-control qSearchItemQuery" placeholder="' + i18n('ext_addQuickSearchQueryPlaceholder') + '" />';
    var buttonCloseHtml = '<button type="button" class="close">&times;</button>';
    var buttonAddHtml = '<button type="button" class="close" data="add">&#43;</button>';
    var quickSearchListHtml = '';

    for (var i = 0; i < this.quickSearches.length; ++i) {
      var qSearch = this.quickSearches[i];
      quickSearchListHtml += '<li class="list-group-item">';
      quickSearchListHtml += '<div class="qSearchItemName"><span>'+qSearch.name+'</span><input type="text" class="form-control" value="'+qSearch.name+'" /></div>';
      quickSearchListHtml += '<div class="qSearchItemQuery"><span>'+qSearch.url+'</span><input type="text" class="form-control" value="'+qSearch.url+'" /></div>';
      quickSearchListHtml += buttonCloseHtml + '</li>';
    }
    quickSearchListHtml += '<li class="list-group-item">' + addNewSearchHtml + buttonAddHtml + '</li>';
    $('#ext_quickSearchList').html(quickSearchListHtml);
  },

  validateQuickSearchInput: function(node) {
    var val = node.val();
    if (val === '') {
      node.addClass('has-error');
      return;
    }
    var isQuery = node.hasClass('qSearchItemQuery') || node.parent().hasClass('qSearchItemQuery');
    if (isQuery && val.indexOf('%s') < 0) {
      node.addClass('has-error');
    } else {
      node.removeClass('has-error');
    }
  },

  setupQuickSearchUiHandlers: function() {
    var self = this;
    $('#ext_quickSearchList li input').on('input', function(e) {
      var node = $(this);
      if (node.parent().is('li')) {
        // is at the add new node, check if other node is also empty
        var inputs = node.parent().find('input');
        for (var i = 0; i < inputs.length; ++i) {
          node = $(inputs[i]);
          self.validateQuickSearchInput(node);
        }
      } else {
        self.validateQuickSearchInput(node);
      }
    });

    $('#ext_quickSearchList li button').click(function(e) {
      if ($(this).attr('data') == 'add') {
        var parent = $(this.parentNode);
        var nameNode = parent.find('input.qSearchItemName');
        var queryNode = parent.find('input.qSearchItemQuery');
        var nameVal = nameNode.val();
        var queryVal = queryNode.val();
        // validate input
        if (nameNode.hasClass('has-error') || queryNode.hasClass('has-error') ||
            nameVal === '' || queryVal === '') {
          return;
        }

        // add
        self.quickSearches.push({ name: nameVal, url: queryVal });
        self.setupQuickSearchUiList();
        self.setupQuickSearchUiHandlers();
      } else {
        // update quickSearches then remove
        var ind = $('#ext_quickSearchList li').index(this.parentNode);
        if (ind > -1) {
          self.quickSearches.splice(ind, 1);
        }
        $(this).parent().remove();
      }
    });

    $('#ext_quickSearchList li div').click(function(e) {
      $(this).parent().addClass('editMode');
      var inputToSelect = $(this).find('input');
      inputToSelect[0].select();
    }).focusout(function(e) {
      if (e.relatedTarget && e.relatedTarget.parentNode && 
          this.parentNode == e.relatedTarget.parentNode.parentNode) {
        return;
      }

      var parent = $(this).parent();
      if (parent.find('.has-error').length) {
        return;
      }

      if ($(this).is('input') && parent.is('li')) {
        // focus out from add new
      } else {
        parent.removeClass('editMode');
        // update on span
        var nameVal = parent.find('.qSearchItemName input').val();
        var queryVal = parent.find('.qSearchItemQuery input').val();
        parent.find('.qSearchItemName span').text(nameVal);
        parent.find('.qSearchItemQuery span').text(queryVal);

        // save this now
        var ind = $('#ext_quickSearchList li').index(this.parentNode);
        if (ind > -1) {
          self.quickSearches[ind] = { name: nameVal, url: queryVal };
          // update the context menu as well
        }
      }
    });
  },

  setupExtensionsPage: function() {
    this.setupQuickSearchUiList();
    this.setupQuickSearchUiHandlers();
  },

  setupAboutPage: function() {
    ReactDOM.render(<AboutPane />, $('#tabContentAbout').get(0));
  },

  refreshBlacklistOnUi: function() {
    var listNode = $('#opt_blacklistedUsers');
    var listStr = Object.keys(this.blacklistedUserIds).join('\n');
    listNode.val(listStr);
  },

  readBlacklistValues: function() {
    var listNode = $('#opt_blacklistedUsers');
    var listStr = listNode.val();
    var blacklistArray = listStr.split('\n');

    this.blacklistedUserIds = {};

    for (var i in blacklistArray) {
      var b = blacklistArray[i];
      if (!b) continue;
      this.blacklistedUserIds[b.replace(' ','').toLowerCase()] = true;
    }
    this.setBlacklistValue();
    this.app.view.redraw(true);
  },

  saveAndDoneWithIt: function() {
    var self = this;
    var data = {
      values: self.values,
    };
    this.setStorage(data);
    this.updateToApp();
    this.app.modalShown = false;
    this.app.setInputAreaFocus();
  },

  readValueFromUi: function() {
    this.readBlacklistValues();
    var selectedVal;
    for (var i in this.values) {
      if (i === 'blacklistedUserIds') {
        continue;
      }
      if (i === 'quickSearchList') {
        this.values[i] = JSON.stringify(this.quickSearches);
        continue;
      }

      if (i === 'mouseBrowsingHighlightColor') {
        selectedVal = $('#opt_'+i+' select').val();
        this.values[i] = parseInt(selectedVal);
        continue;
      }

      if (i in PREF_OPTIONS) {
        selectedVal = $('#opt_'+i+' select').val();
        this.values[i] = parseInt(selectedVal);
        continue;
      }

      var elem = $('#opt_'+i+' input');
      var type = typeof(this.values[i]);
      switch(type) {
        case 'number':
          this.values[i] = parseInt(elem.val());
          break;
        case 'string':
          this.values[i] = elem.val();
          break;
        case 'boolean':
          this.values[i] = elem.prop('checked');
          break;
        default:
          break;
      }
    }
  },

  loadDefault: function(callback) {
    this.values = JSON.parse(JSON.stringify(DEFAULT_PREFS));
    this.updateToApp();
    this.populateSettingsToUi();
    callback();
  },

  updateToApp: function() {
    for (var i in this.values) {
      this.app.onPrefChange(this, i);
    }
  },

  resetSettings: function() {
    this.clearStorage();
    this.getStorage();
  },

  get: function(prefName) {
    console.log(prefName + " = " + this.values[prefName]);
    return this.values[prefName];
  },

  set: function(prefName, value) {
    this.values[prefName] = value;
  },

  onStorageDone: function(msg) {
    if (msg.data && msg.data.values) {
      // iterate through default prefs to make sure all up to date
      for (var i in DEFAULT_PREFS) {
        if (!(i in msg.data.values) || msg.data.values[i] === null) {
          this.values[i] = DEFAULT_PREFS[i];
          if (i === 'quickSearchList') {
            this.quickSearches = JSON.parse(this.values[i]);
          }
        } else {
          if (i === 'blacklistedUserIds') {
            this.blacklistedUserIds = JSON.parse(msg.data.values[i]);
          } else if (i === 'quickSearchList') {
            var val = msg.data.values[i];
            this.quickSearches = JSON.parse(val);
            this.values[i] = val;
          } else {
            this.values[i] = msg.data.values[i];
          }
        }
      }
    }
    this.updateToApp();
    this.populateSettingsToUi();
    if (!this.initCallbackCalled) {
      if (this.values !== null) {
        this.initCallbackCalled = true;
        this.onInitializedCallback(this.app);
      }
    }
  },

  getStorage: function(key) {
    console.log("getStorage not implemented, returning defaults.");
    var defaults = {
      values: DEFAULT_PREFS,
    };
    this.onStorageDone({ data: defaults });
  },

  setBlacklistValue: function() {
    var blacklist = JSON.stringify(this.blacklistedUserIds);
    this.values.blacklistedUserIds = blacklist;
  },

  setBlacklistStorage: function() {
    var items = { 
      values: {
        blacklistedUserIds: this.values.blacklistedUserIds
      }
    };
    console.log("setBlacklistStorage not implemented, items: " + items);
  },

  setStorage: function(items) {
    console.log("setStorage not implemented, items: " + items);
  },

  clearStorage: function() {
    console.log("clearStorage not implemented");
  }

};

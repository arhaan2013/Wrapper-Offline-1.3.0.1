Settings.SettingsScreen=class extends UI.VBox{constructor(){super(true);this.registerRequiredCSS('settings/settingsScreen.css');this.contentElement.classList.add('settings-window-main');this.contentElement.classList.add('vbox');const settingsLabelElement=createElement('div');const settingsTitleElement=UI.createShadowRootWithCoreStyles(settingsLabelElement,'settings/settingsScreen.css').createChild('div','settings-window-title');UI.ARIAUtils.markAsHeading(settingsTitleElement,1);settingsTitleElement.textContent=ls`Settings`;this._tabbedLocation=UI.viewManager.createTabbedLocation(()=>Settings.SettingsScreen._showSettingsScreen(),'settings-view');const tabbedPane=this._tabbedLocation.tabbedPane();tabbedPane.leftToolbar().appendToolbarItem(new UI.ToolbarItem(settingsLabelElement));tabbedPane.setShrinkableTabs(false);tabbedPane.makeVerticalTabLayout();const shortcutsView=new UI.SimpleView(ls`Shortcuts`);UI.shortcutsScreen.createShortcutsTabView().show(shortcutsView.element);this._tabbedLocation.appendView(shortcutsView);tabbedPane.show(this.contentElement);this.element.addEventListener('keydown',this._keyDown.bind(this),false);this._developerModeCounter=0;this.setDefaultFocusedElement(this.contentElement);}
static _showSettingsScreen(name){const settingsScreen=(self.runtime.sharedInstance(Settings.SettingsScreen));if(settingsScreen.isShowing()){return;}
const dialog=new UI.Dialog();dialog.contentElement.tabIndex=-1;dialog.addCloseButton();settingsScreen.show(dialog.contentElement);dialog.show();settingsScreen._selectTab(name||'preferences');}
resolveLocation(locationName){return this._tabbedLocation;}
_selectTab(name){UI.viewManager.showView(name);}
_keyDown(event){const shiftKeyCode=16;if(event.keyCode===shiftKeyCode&&++this._developerModeCounter>5){this.contentElement.classList.add('settings-developer-mode');}}};Settings.SettingsTab=class extends UI.VBox{constructor(name,id){super();this.element.classList.add('settings-tab-container');if(id){this.element.id=id;}
const header=this.element.createChild('header');header.createChild('h1').createTextChild(name);this.containerElement=this.element.createChild('div','settings-container-wrapper').createChild('div','settings-tab settings-content settings-container');}
_appendSection(name){const block=this.containerElement.createChild('div','settings-block');if(name){UI.ARIAUtils.markAsGroup(block);const title=block.createChild('div','settings-section-title');title.textContent=name;UI.ARIAUtils.markAsHeading(title,2);UI.ARIAUtils.setAccessibleName(block,name);}
return block;}};Settings.GenericSettingsTab=class extends Settings.SettingsTab{constructor(){super(Common.UIString('Preferences'),'preferences-tab-content');const explicitSectionOrder=['','Appearance','Sources','Elements','Network','Performance','Console','Extensions'];this._nameToSection=new Map();for(const sectionName of explicitSectionOrder){this._sectionElement(sectionName);}
self.runtime.extensions('setting').forEach(this._addSetting.bind(this));self.runtime.extensions(UI.SettingUI).forEach(this._addSettingUI.bind(this));this._appendSection().appendChild(UI.createTextButton(Common.UIString('Restore defaults and reload'),restoreAndReload));function restoreAndReload(){Common.settings.clearAll();Components.reload();}}
static isSettingVisible(extension){const descriptor=extension.descriptor();if(!('title'in descriptor)){return false;}
if(!('category'in descriptor)){return false;}
return true;}
_addSetting(extension){if(!Settings.GenericSettingsTab.isSettingVisible(extension)){return;}
const sectionElement=this._sectionElement(extension.descriptor()['category']);const setting=Common.moduleSetting(extension.descriptor()['settingName']);const settingControl=UI.SettingsUI.createControlForSetting(setting);if(settingControl){sectionElement.appendChild(settingControl);}}
_addSettingUI(extension){const descriptor=extension.descriptor();const sectionName=descriptor['category']||'';extension.instance().then(appendCustomSetting.bind(this));function appendCustomSetting(object){const settingUI=(object);const element=settingUI.settingElement();if(element){this._sectionElement(sectionName).appendChild(element);}}}
_sectionElement(sectionName){let sectionElement=this._nameToSection.get(sectionName);if(!sectionElement){const uiSectionName=sectionName&&Common.UIString(sectionName);sectionElement=this._appendSection(uiSectionName);this._nameToSection.set(sectionName,sectionElement);}
return sectionElement;}};Settings.ExperimentsSettingsTab=class extends Settings.SettingsTab{constructor(){super(Common.UIString('Experiments'),'experiments-tab-content');const experiments=Root.Runtime.experiments.allConfigurableExperiments();if(experiments.length){const experimentsSection=this._appendSection();experimentsSection.appendChild(this._createExperimentsWarningSubsection());for(let i=0;i<experiments.length;++i){experimentsSection.appendChild(this._createExperimentCheckbox(experiments[i]));}}}
_createExperimentsWarningSubsection(){const subsection=createElement('div');const warning=subsection.createChild('span','settings-experiments-warning-subsection-warning');warning.textContent=Common.UIString('WARNING:');subsection.createTextChild(' ');const message=subsection.createChild('span','settings-experiments-warning-subsection-message');message.textContent=Common.UIString('These experiments could be dangerous and may require restart.');return subsection;}
_createExperimentCheckbox(experiment){const label=UI.CheckboxLabel.create(Common.UIString(experiment.title),experiment.isEnabled());const input=label.checkboxElement;input.name=experiment.name;function listener(){experiment.setEnabled(input.checked);}
input.addEventListener('click',listener,false);const p=createElement('p');p.className=experiment.hidden&&!experiment.isEnabled()?'settings-experiment-hidden':'';p.appendChild(label);return p;}};Settings.SettingsScreen.ActionDelegate=class{handleAction(context,actionId){switch(actionId){case'settings.show':Settings.SettingsScreen._showSettingsScreen();return true;case'settings.documentation':Host.InspectorFrontendHost.openInNewTab('https://developers.9oo91e.qjz9zk/web/tools/chrome-devtools/');return true;case'settings.shortcuts':Settings.SettingsScreen._showSettingsScreen(Common.UIString('Shortcuts'));return true;}
return false;}};Settings.SettingsScreen.Revealer=class{reveal(object){console.assert(object instanceof Common.Setting);const setting=(object);let success=false;self.runtime.extensions('setting').forEach(revealModuleSetting);self.runtime.extensions(UI.SettingUI).forEach(revealSettingUI);self.runtime.extensions('view').forEach(revealSettingsView);return success?Promise.resolve():Promise.reject();function revealModuleSetting(extension){if(!Settings.GenericSettingsTab.isSettingVisible(extension)){return;}
if(extension.descriptor()['settingName']===setting.name){Host.InspectorFrontendHost.bringToFront();Settings.SettingsScreen._showSettingsScreen();success=true;}}
function revealSettingUI(extension){const settings=extension.descriptor()['settings'];if(settings&&settings.indexOf(setting.name)!==-1){Host.InspectorFrontendHost.bringToFront();Settings.SettingsScreen._showSettingsScreen();success=true;}}
function revealSettingsView(extension){const location=extension.descriptor()['location'];if(location!=='settings-view'){return;}
const settings=extension.descriptor()['settings'];if(settings&&settings.indexOf(setting.name)!==-1){Host.InspectorFrontendHost.bringToFront();Settings.SettingsScreen._showSettingsScreen(extension.descriptor()['id']);success=true;}}}};;Settings.FrameworkBlackboxSettingsTab=class extends UI.VBox{constructor(){super(true);this.registerRequiredCSS('settings/frameworkBlackboxSettingsTab.css');const header=this.contentElement.createChild('div','header');header.textContent=ls`Framework Blackboxing`;UI.ARIAUtils.markAsHeading(header,1);this.contentElement.createChild('div','intro').textContent=ls`Debugger will skip through the scripts and will not stop on exceptions thrown by them.`;const blackboxContentScripts=this.contentElement.createChild('div','blackbox-content-scripts');blackboxContentScripts.appendChild(UI.SettingsUI.createSettingCheckbox(ls`Blackbox content scripts`,Common.moduleSetting('skipContentScripts'),true));blackboxContentScripts.title=ls`Blackbox content scripts (extension scripts in the page)`;this._blackboxLabel=Common.UIString('Blackbox');this._disabledLabel=Common.UIString('Disabled');this._list=new UI.ListWidget(this);this._list.element.classList.add('blackbox-list');this._list.registerRequiredCSS('settings/frameworkBlackboxSettingsTab.css');const placeholder=createElementWithClass('div','blackbox-list-empty');placeholder.textContent=Common.UIString('No blackboxed patterns');this._list.setEmptyPlaceholder(placeholder);this._list.show(this.contentElement);const addPatternButton=UI.createTextButton(Common.UIString('Add pattern...'),this._addButtonClicked.bind(this),'add-button');this.contentElement.appendChild(addPatternButton);this._setting=Common.moduleSetting('skipStackFramesPattern');this._setting.addChangeListener(this._settingUpdated,this);this.setDefaultFocusedElement(addPatternButton);}
wasShown(){super.wasShown();this._settingUpdated();}
_settingUpdated(){this._list.clear();const patterns=this._setting.getAsArray();for(let i=0;i<patterns.length;++i){this._list.appendItem(patterns[i],true);}}
_addButtonClicked(){this._list.addNewItem(this._setting.getAsArray().length,{pattern:'',disabled:false});}
renderItem(item,editable){const element=createElementWithClass('div','blackbox-list-item');const pattern=element.createChild('div','blackbox-pattern');pattern.textContent=item.pattern;pattern.title=ls`Blackbox scripts whose names match '${item.pattern}'`;element.createChild('div','blackbox-separator');element.createChild('div','blackbox-behavior').textContent=item.disabled?this._disabledLabel:this._blackboxLabel;if(item.disabled){element.classList.add('blackbox-disabled');}
return element;}
removeItemRequested(item,index){const patterns=this._setting.getAsArray();patterns.splice(index,1);this._setting.setAsArray(patterns);}
commitEdit(item,editor,isNew){item.pattern=editor.control('pattern').value.trim();item.disabled=editor.control('behavior').value===this._disabledLabel;const list=this._setting.getAsArray();if(isNew){list.push(item);}
this._setting.setAsArray(list);}
beginEdit(item){const editor=this._createEditor();editor.control('pattern').value=item.pattern;editor.control('behavior').value=item.disabled?this._disabledLabel:this._blackboxLabel;return editor;}
_createEditor(){if(this._editor){return this._editor;}
const editor=new UI.ListWidget.Editor();this._editor=editor;const content=editor.contentElement();const titles=content.createChild('div','blackbox-edit-row');titles.createChild('div','blackbox-pattern').textContent=Common.UIString('Pattern');titles.createChild('div','blackbox-separator blackbox-separator-invisible');titles.createChild('div','blackbox-behavior').textContent=Common.UIString('Behavior');const fields=content.createChild('div','blackbox-edit-row');const pattern=editor.createInput('pattern','text','/framework\\.js$',patternValidator.bind(this));UI.ARIAUtils.setAccessibleName(pattern,ls`Pattern`);fields.createChild('div','blackbox-pattern').appendChild(pattern);fields.createChild('div','blackbox-separator blackbox-separator-invisible');const behavior=editor.createSelect('behavior',[this._blackboxLabel,this._disabledLabel],behaviorValidator);UI.ARIAUtils.setAccessibleName(behavior,ls`Behavior`);fields.createChild('div','blackbox-behavior').appendChild(behavior);return editor;function patternValidator(item,index,input){const pattern=input.value.trim();const patterns=this._setting.getAsArray();if(!pattern.length){return{valid:false,errorMessage:ls`Pattern cannot be empty`};}
for(let i=0;i<patterns.length;++i){if(i!==index&&patterns[i].pattern===pattern){return{valid:false,errorMessage:ls`Pattern already exists`};}}
let regex;try{regex=new RegExp(pattern);}catch(e){}
if(!regex){return{valid:false,errorMessage:ls`Pattern must be a valid regular expression`};}else{return{valid:true};}}
function behaviorValidator(item,index,input){return{valid:true};}}};;Root.Runtime.cachedResources["settings/frameworkBlackboxSettingsTab.css"]="/*\n * Copyright 2015 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n:host {\n    overflow:hidden;\n}\n\n.header {\n    padding: 0 0 6px;\n    border-bottom: 1px solid #EEEEEE;\n    font-size: 18px;\n    font-weight: normal;\n    flex: none;\n}\n\n.intro {\n    margin-top: 10px;\n}\n\n.blackbox-content-scripts {\n    margin-top: 10px;\n    flex: none;\n}\n\n.add-button {\n    margin: 10px 2px;\n    align-self: flex-start;\n    flex: none;\n}\n\n.blackbox-list {\n    margin-top: 10px;\n    max-width: 500px;\n    flex: 0 1 auto;\n    min-height: 30px;\n}\n\n.blackbox-list-empty {\n    flex: auto;\n    height: 30px;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n}\n\n.blackbox-list-item {\n    padding: 3px 5px 3px 5px;\n    height: 30px;\n    display: flex;\n    align-items: center;\n    position: relative;\n    flex: auto 1 1;\n}\n\n .blackbox-list-item .blackbox-pattern {\n    white-space: nowrap;\n    text-overflow: ellipsis;\n    -webkit-user-select: none;\n    color: #222;\n    overflow: hidden;\n}\n\n.blackbox-pattern {\n    flex: auto;\n    min-width: 100px;\n}\n\n.blackbox-list-item.blackbox-disabled .blackbox-pattern {\n    text-decoration: line-through;\n}\n\n.blackbox-behavior {\n    flex: 0 0 100px;\n    padding-left: 10px;\n}\n\n.blackbox-behavior > select {\n    margin-left: -10px;\n}\n\n.blackbox-separator {\n    flex: 0 0 1px;\n    background-color: rgb(231, 231, 231);\n    height: 30px;\n    margin: 0 4px;\n}\n\n.blackbox-separator-invisible {\n    visibility: hidden;\n    height: 100% !important;\n}\n\n.blackbox-edit-row {\n    flex: none;\n    display: flex;\n    flex-direction: row;\n    margin: 6px 5px;\n    align-items: center;\n}\n\n.blackbox-edit-row input,\n.blackbox-edit-row select {\n    width: 100%;\n    text-align: inherit;\n}\n\n/*# sourceURL=settings/frameworkBlackboxSettingsTab.css */";Root.Runtime.cachedResources["settings/settingsScreen.css"]="/*\n * Copyright (c) 2015 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.settings-window-main {\n    color: rgb(48, 57, 66);\n    background-color: white;\n    padding: 11px 0 0 0;\n}\n\n.settings-content {\n    overflow-y: auto;\n    overflow-x: hidden;\n    margin: 8px 8px 8px 0;\n    padding: 0 4px;\n    flex: auto;\n}\n\n.settings-footnote {\n    border-top: 1px solid #EEEEEE;\n    margin: 0;\n    padding: 12px;\n}\n\n.settings-container {\n    width: 100%;\n    -webkit-column-width: 288px;\n}\n\n.settings-block {\n    display: block;\n    padding-bottom: 9px;\n    width: 288px;\n    -webkit-column-break-inside: avoid;\n}\n\n.settings-tab.settings-container {\n    -webkit-column-width: 308px;\n}\n\n.settings-tab .settings-block {\n    margin-left: 20px;\n}\n\n.settings-line {\n    padding-bottom: 5px;\n    margin-bottom: 5px;\n}\n\n.settings-key-cell {\n    display: inline-block;\n    width: 153px;\n    white-space: nowrap;\n    text-align: right;\n    vertical-align: middle;\n    padding-right: 6px;\n}\n\n.settings-cell {\n    display: inline-block;\n    width: 135px;\n    vertical-align: middle;\n}\n\n.settings-section-title {\n    font-size: 120%;\n    text-align: left;\n}\n\n.settings-key {\n    padding: 0.1em 0.6em;\n    border: 1px solid #ccc;\n    font-size: 11px;\n    background-color: #f7f7f7;\n    color: #333;\n    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.2), 0 0 0 2px #ffffff inset;\n    border-radius: 3px;\n    display: inline-block;\n    margin: 0 0.1em;\n    text-shadow: 0 1px 0 #fff;\n    line-height: 1.5;\n    white-space: nowrap;\n}\n\n.settings-combine-keys,\n.settings-key-delimiter {\n    font-size: 9px;\n}\n\n.settings-combine-keys {\n    margin: 0 0.3em;\n}\n\n.settings-key-delimiter {\n    margin: 0 0.5em;\n    display: none;\n}\n\nfieldset {\n    margin: 0;\n    padding: 0;\n    border: none;\n}\n\n.settings-tab label {\n    padding-right: 4px;\n    display: inline-flex;\n    flex-shrink: 0;\n}\n\n.settings-block p p {\n    padding-left: 30px;\n}\n\n.settings-experiments-warning-subsection-warning {\n    color: rgb(200, 0, 0);\n}\n\n.settings-experiments-warning-subsection-message {\n    color: inherit;\n}\n\n.settings-content input[type=checkbox] {\n    margin: 1px 7px 1px 2px;\n}\n\n.settings-window-title {\n    font-size: 18px;\n    color: rgb(48, 57, 66);\n    padding: 0 0 5px 13px;\n}\n\n.settings-container-wrapper {\n    position: absolute;\n    top: 31px;\n    left: 0px;\n    right: 0;\n    bottom: 0;\n    overflow: auto;\n    padding-top: 9px;\n}\n\n.settings-tab.settings-content {\n    margin: 0;\n    padding: 0;\n}\n\n.settings-tab-container {\n    flex: auto;\n    overflow: hidden;\n}\n\n.settings-tab-container header {\n    padding: 0 0 6px;\n    border-bottom: 1px solid #EEEEEE;\n}\n\n#experiments-tab-content .settings-container {\n    -webkit-column-width: 470px;\n}\n\n#experiments-tab-content .settings-block {\n    width: 470px;\n    margin-left: 0;\n}\n\n.settings-tab-container header > h1 {\n    font-size: 18px;\n    font-weight: normal;\n    margin: 0;\n    padding-bottom: 3px;\n}\n\n.settings-tab .settings-section-title {\n    margin-left: -20px;\n    color: #222;\n}\n\n.settings-tab .settings-block fieldset:disabled label:hover {\n    color: inherit;\n}\n\n.settings-tab .settings-block label:hover {\n    color: #222;\n}\n\n.settings-tab p {\n    margin: 12px 0;\n}\n\n.settings-tab select {\n    margin-left: 10px;\n}\n\n.settings-experiment-hidden {\n    display: none;\n}\n\n.settings-experiment-hidden [is=dt-checkbox] {\n    background-color: #ddd;\n}\n\n.settings-developer-mode .settings-experiment-hidden {\n    display: block;\n}\n\n/*# sourceURL=settings/settingsScreen.css */";
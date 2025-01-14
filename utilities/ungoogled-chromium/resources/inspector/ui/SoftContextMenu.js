export default class SoftContextMenu{constructor(items,itemSelectedCallback,parentMenu){this._items=items;this._itemSelectedCallback=itemSelectedCallback;this._parentMenu=parentMenu;this._highlightedMenuItemElement=null;}
show(document,anchorBox){if(!this._items.length){return;}
this._document=document;this._glassPane=new UI.GlassPane();this._glassPane.setPointerEventsBehavior(this._parentMenu?UI.GlassPane.PointerEventsBehavior.PierceGlassPane:UI.GlassPane.PointerEventsBehavior.BlockedByGlassPane);this._glassPane.registerRequiredCSS('ui/softContextMenu.css');this._glassPane.setContentAnchorBox(anchorBox);this._glassPane.setSizeBehavior(UI.GlassPane.SizeBehavior.MeasureContent);this._glassPane.setMarginBehavior(UI.GlassPane.MarginBehavior.NoMargin);this._glassPane.setAnchorBehavior(this._parentMenu?UI.GlassPane.AnchorBehavior.PreferRight:UI.GlassPane.AnchorBehavior.PreferBottom);this._contextMenuElement=this._glassPane.contentElement.createChild('div','soft-context-menu');this._contextMenuElement.tabIndex=-1;UI.ARIAUtils.markAsMenu(this._contextMenuElement);this._contextMenuElement.addEventListener('mouseup',e=>e.consume(),false);this._contextMenuElement.addEventListener('keydown',this._menuKeyDown.bind(this),false);for(let i=0;i<this._items.length;++i){this._contextMenuElement.appendChild(this._createMenuItem(this._items[i]));}
this._glassPane.show(document);this._focusRestorer=new UI.ElementFocusRestorer(this._contextMenuElement);if(!this._parentMenu){this._hideOnUserGesture=event=>{let subMenu=this._subMenu;while(subMenu){if(subMenu._contextMenuElement===event.path[0]){return;}
subMenu=subMenu._subMenu;}
this.discard();event.consume(true);};this._document.body.addEventListener('mousedown',this._hideOnUserGesture,false);this._document.defaultView.addEventListener('resize',this._hideOnUserGesture,false);}}
discard(){if(this._subMenu){this._subMenu.discard();}
if(this._focusRestorer){this._focusRestorer.restore();}
if(this._glassPane){this._glassPane.hide();delete this._glassPane;if(this._hideOnUserGesture){this._document.body.removeEventListener('mousedown',this._hideOnUserGesture,false);this._document.defaultView.removeEventListener('resize',this._hideOnUserGesture,false);delete this._hideOnUserGesture;}}
if(this._parentMenu){delete this._parentMenu._subMenu;}}
_createMenuItem(item){if(item.type==='separator'){return this._createSeparator();}
if(item.type==='subMenu'){return this._createSubMenu(item);}
const menuItemElement=createElementWithClass('div','soft-context-menu-item');menuItemElement.tabIndex=-1;UI.ARIAUtils.markAsMenuItem(menuItemElement);const checkMarkElement=UI.Icon.create('smallicon-checkmark','checkmark');menuItemElement.appendChild(checkMarkElement);if(!item.checked){checkMarkElement.style.opacity='0';}
if(item.element){const wrapper=menuItemElement.createChild('div','soft-context-menu-custom-item');wrapper.appendChild(item.element);menuItemElement._customElement=item.element;return menuItemElement;}
if(!item.enabled){menuItemElement.classList.add('soft-context-menu-disabled');}
menuItemElement.createTextChild(item.label);menuItemElement.createChild('span','soft-context-menu-shortcut').textContent=item.shortcut;menuItemElement.addEventListener('mousedown',this._menuItemMouseDown.bind(this),false);menuItemElement.addEventListener('mouseup',this._menuItemMouseUp.bind(this),false);menuItemElement.addEventListener('mouseover',this._menuItemMouseOver.bind(this),false);menuItemElement.addEventListener('mouseleave',this._menuItemMouseLeave.bind(this),false);menuItemElement._actionId=item.id;let accessibleName=item.label;if(item.type==='checkbox'){const checkedState=item.checked?ls`checked`:ls`unchecked`;if(item.shortcut){accessibleName=ls`${item.label}, ${item.shortcut}, ${checkedState}`;}else{accessibleName=ls`${item.label}, ${checkedState}`;}}else if(item.shortcut){accessibleName=ls`${item.label}, ${item.shortcut}`;}
UI.ARIAUtils.setAccessibleName(menuItemElement,accessibleName);return menuItemElement;}
_createSubMenu(item){const menuItemElement=createElementWithClass('div','soft-context-menu-item');menuItemElement._subItems=item.subItems;menuItemElement.tabIndex=-1;UI.ARIAUtils.markAsMenuItemSubMenu(menuItemElement);const checkMarkElement=UI.Icon.create('smallicon-checkmark','soft-context-menu-item-checkmark');checkMarkElement.classList.add('checkmark');menuItemElement.appendChild(checkMarkElement);checkMarkElement.style.opacity='0';menuItemElement.createTextChild(item.label);if(Host.isMac()&&!UI.themeSupport.hasTheme()){const subMenuArrowElement=menuItemElement.createChild('span','soft-context-menu-item-submenu-arrow');subMenuArrowElement.textContent='\u25B6';}else{const subMenuArrowElement=UI.Icon.create('smallicon-triangle-right','soft-context-menu-item-submenu-arrow');menuItemElement.appendChild(subMenuArrowElement);}
menuItemElement.addEventListener('mousedown',this._menuItemMouseDown.bind(this),false);menuItemElement.addEventListener('mouseup',this._menuItemMouseUp.bind(this),false);menuItemElement.addEventListener('mouseover',this._menuItemMouseOver.bind(this),false);menuItemElement.addEventListener('mouseleave',this._menuItemMouseLeave.bind(this),false);return menuItemElement;}
_createSeparator(){const separatorElement=createElementWithClass('div','soft-context-menu-separator');separatorElement._isSeparator=true;separatorElement.createChild('div','separator-line');return separatorElement;}
_menuItemMouseDown(event){event.consume(true);}
_menuItemMouseUp(event){this._triggerAction(event.target,event);event.consume();}
_root(){let root=this;while(root._parentMenu){root=root._parentMenu;}
return root;}
_triggerAction(menuItemElement,event){if(!menuItemElement._subItems){this._root().discard();event.consume(true);if(typeof menuItemElement._actionId!=='undefined'){this._itemSelectedCallback(menuItemElement._actionId);delete menuItemElement._actionId;}
return;}
this._showSubMenu(menuItemElement);event.consume();}
_showSubMenu(menuItemElement){if(menuItemElement._subMenuTimer){clearTimeout(menuItemElement._subMenuTimer);delete menuItemElement._subMenuTimer;}
if(this._subMenu){return;}
this._subMenu=new SoftContextMenu(menuItemElement._subItems,this._itemSelectedCallback,this);const anchorBox=menuItemElement.boxInWindow();anchorBox.y-=5;anchorBox.x+=3;anchorBox.width-=6;anchorBox.height+=10;this._subMenu.show(this._document,anchorBox);}
_menuItemMouseOver(event){this._highlightMenuItem(event.target,true);}
_menuItemMouseLeave(event){if(!this._subMenu||!event.relatedTarget){this._highlightMenuItem(null,true);return;}
const relatedTarget=event.relatedTarget;if(relatedTarget===this._contextMenuElement){this._highlightMenuItem(null,true);}}
_highlightMenuItem(menuItemElement,scheduleSubMenu){if(this._highlightedMenuItemElement===menuItemElement){return;}
if(this._subMenu){this._subMenu.discard();}
if(this._highlightedMenuItemElement){this._highlightedMenuItemElement.classList.remove('force-white-icons');this._highlightedMenuItemElement.classList.remove('soft-context-menu-item-mouse-over');if(this._highlightedMenuItemElement._subItems&&this._highlightedMenuItemElement._subMenuTimer){clearTimeout(this._highlightedMenuItemElement._subMenuTimer);delete this._highlightedMenuItemElement._subMenuTimer;}}
this._highlightedMenuItemElement=menuItemElement;if(this._highlightedMenuItemElement){if(UI.themeSupport.hasTheme()||Host.isMac()){this._highlightedMenuItemElement.classList.add('force-white-icons');}
this._highlightedMenuItemElement.classList.add('soft-context-menu-item-mouse-over');if(this._highlightedMenuItemElement._customElement){this._highlightedMenuItemElement._customElement.focus();}else{this._highlightedMenuItemElement.focus();}
if(scheduleSubMenu&&this._highlightedMenuItemElement._subItems&&!this._highlightedMenuItemElement._subMenuTimer){this._highlightedMenuItemElement._subMenuTimer=setTimeout(this._showSubMenu.bind(this,this._highlightedMenuItemElement),150);}}}
_highlightPrevious(){let menuItemElement=this._highlightedMenuItemElement?this._highlightedMenuItemElement.previousSibling:this._contextMenuElement.lastChild;while(menuItemElement&&(menuItemElement._isSeparator||menuItemElement.classList.contains('soft-context-menu-disabled'))){menuItemElement=menuItemElement.previousSibling;}
if(menuItemElement){this._highlightMenuItem(menuItemElement,false);}}
_highlightNext(){let menuItemElement=this._highlightedMenuItemElement?this._highlightedMenuItemElement.nextSibling:this._contextMenuElement.firstChild;while(menuItemElement&&(menuItemElement._isSeparator||menuItemElement.classList.contains('soft-context-menu-disabled'))){menuItemElement=menuItemElement.nextSibling;}
if(menuItemElement){this._highlightMenuItem(menuItemElement,false);}}
_menuKeyDown(event){switch(event.key){case'ArrowUp':this._highlightPrevious();break;case'ArrowDown':this._highlightNext();break;case'ArrowLeft':if(this._parentMenu){this._highlightMenuItem(null,false);this.discard();}
break;case'ArrowRight':if(!this._highlightedMenuItemElement){break;}
if(this._highlightedMenuItemElement._subItems){this._showSubMenu(this._highlightedMenuItemElement);this._subMenu._highlightNext();}
break;case'Escape':this.discard();break;case'Enter':if(!isEnterKey(event)){return;}
case' ':if(!this._highlightedMenuItemElement||this._highlightedMenuItemElement._customElement){return;}
this._triggerAction(this._highlightedMenuItemElement,event);if(this._highlightedMenuItemElement._subItems){this._subMenu._highlightNext();}
break;}
event.consume(true);}}
self.UI=self.UI||{};UI=UI||{};UI.SoftContextMenu=SoftContextMenu;
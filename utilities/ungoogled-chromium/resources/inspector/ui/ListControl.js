export class ListDelegate{createElementForItem(item){}
heightForItem(item){}
isItemSelectable(item){}
selectedItemChanged(from,to,fromElement,toElement){}}
export const ListMode={NonViewport:Symbol('UI.ListMode.NonViewport'),EqualHeightItems:Symbol('UI.ListMode.EqualHeightItems'),VariousHeightItems:Symbol('UI.ListMode.VariousHeightItems')};export default class ListControl{constructor(model,delegate,mode){this.element=createElement('div');this.element.style.overflowY='auto';this._topElement=this.element.createChild('div');this._bottomElement=this.element.createChild('div');this._firstIndex=0;this._lastIndex=0;this._renderedHeight=0;this._topHeight=0;this._bottomHeight=0;this._model=model;this._model.addEventListener(UI.ListModel.Events.ItemsReplaced,this._replacedItemsInRange,this);this._itemToElement=new Map();this._selectedIndex=-1;this._selectedItem=null;this.element.tabIndex=-1;this.element.addEventListener('click',this._onClick.bind(this),false);this.element.addEventListener('keydown',this._onKeyDown.bind(this),false);this._delegate=delegate;this._mode=mode||UI.ListMode.EqualHeightItems;this._fixedHeight=0;this._variableOffsets=new Int32Array(0);this._clearContents();if(this._mode!==UI.ListMode.NonViewport){this.element.addEventListener('scroll',()=>{this._updateViewport(this.element.scrollTop,this.element.offsetHeight);},false);}}
setModel(model){this._itemToElement.clear();const length=this._model.length;this._model.removeEventListener(UI.ListModel.Events.ItemsReplaced,this._replacedItemsInRange,this);this._model=model;this._model.addEventListener(UI.ListModel.Events.ItemsReplaced,this._replacedItemsInRange,this);this.invalidateRange(0,length);}
_replacedItemsInRange(event){const data=(event.data);const from=data.index;const to=from+data.removed.length;const oldSelectedItem=this._selectedItem;const oldSelectedElement=oldSelectedItem?(this._itemToElement.get(oldSelectedItem)||null):null;for(let i=0;i<data.removed.length;i++){this._itemToElement.delete(data.removed[i]);}
this._invalidate(from,to,data.inserted);if(this._selectedIndex>=to){this._selectedIndex+=data.inserted-(to-from);this._selectedItem=this._model.at(this._selectedIndex);}else if(this._selectedIndex>=from){let index=this._findFirstSelectable(from+data.inserted,+1,false);if(index===-1){index=this._findFirstSelectable(from-1,-1,false);}
this._select(index,oldSelectedItem,oldSelectedElement);}}
refreshItem(item){const index=this._model.indexOf(item);if(index===-1){console.error('Item to refresh is not present');return;}
this.refreshItemByIndex(index);}
refreshItemByIndex(index){const item=this._model.at(index);this._itemToElement.delete(item);this.invalidateRange(index,index+1);if(this._selectedIndex!==-1){this._select(this._selectedIndex,null,null);}}
invalidateRange(from,to){this._invalidate(from,to,to-from);}
viewportResized(){if(this._mode===UI.ListMode.NonViewport){return;}
const scrollTop=this.element.scrollTop;const viewportHeight=this.element.offsetHeight;this._clearViewport();this._updateViewport(Number.constrain(scrollTop,0,this._totalHeight()-viewportHeight),viewportHeight);}
invalidateItemHeight(){if(this._mode!==UI.ListMode.EqualHeightItems){console.error('Only supported in equal height items mode');return;}
this._fixedHeight=0;if(this._model.length){this._itemToElement.clear();this._invalidate(0,this._model.length,this._model.length);}}
itemForNode(node){while(node&&node.parentNodeOrShadowHost()!==this.element){node=node.parentNodeOrShadowHost();}
if(!node){return null;}
const element=(node);const index=this._model.findIndex(item=>this._itemToElement.get(item)===element);return index!==-1?this._model.at(index):null;}
scrollItemIntoView(item,center){const index=this._model.indexOf(item);if(index===-1){console.error('Attempt to scroll onto missing item');return;}
this._scrollIntoView(index,center);}
selectedItem(){return this._selectedItem;}
selectedIndex(){return this._selectedIndex;}
selectItem(item,center,dontScroll){let index=-1;if(item!==null){index=this._model.indexOf(item);if(index===-1){console.error('Attempt to select missing item');return;}
if(!this._delegate.isItemSelectable(item)){console.error('Attempt to select non-selectable item');return;}}
if(index!==-1&&!dontScroll){this._scrollIntoView(index,center);}
if(this._selectedIndex!==index){this._select(index);}}
selectPreviousItem(canWrap,center){if(this._selectedIndex===-1&&!canWrap){return false;}
let index=this._selectedIndex===-1?this._model.length-1:this._selectedIndex-1;index=this._findFirstSelectable(index,-1,!!canWrap);if(index!==-1){this._scrollIntoView(index,center);this._select(index);return true;}
return false;}
selectNextItem(canWrap,center){if(this._selectedIndex===-1&&!canWrap){return false;}
let index=this._selectedIndex===-1?0:this._selectedIndex+1;index=this._findFirstSelectable(index,+1,!!canWrap);if(index!==-1){this._scrollIntoView(index,center);this._select(index);return true;}
return false;}
selectItemPreviousPage(center){if(this._mode===UI.ListMode.NonViewport){return false;}
let index=this._selectedIndex===-1?this._model.length-1:this._selectedIndex;index=this._findPageSelectable(index,-1);if(index!==-1){this._scrollIntoView(index,center);this._select(index);return true;}
return false;}
selectItemNextPage(center){if(this._mode===UI.ListMode.NonViewport){return false;}
let index=this._selectedIndex===-1?0:this._selectedIndex;index=this._findPageSelectable(index,+1);if(index!==-1){this._scrollIntoView(index,center);this._select(index);return true;}
return false;}
_scrollIntoView(index,center){if(this._mode===UI.ListMode.NonViewport){this._elementAtIndex(index).scrollIntoViewIfNeeded(!!center);return;}
const top=this._offsetAtIndex(index);const bottom=this._offsetAtIndex(index+1);const viewportHeight=this.element.offsetHeight;if(center){const scrollTo=(top+bottom)/2-viewportHeight/2;this._updateViewport(Number.constrain(scrollTo,0,this._totalHeight()-viewportHeight),viewportHeight);return;}
const scrollTop=this.element.scrollTop;if(top<scrollTop){this._updateViewport(top,viewportHeight);}else if(bottom>scrollTop+viewportHeight){this._updateViewport(bottom-viewportHeight,viewportHeight);}}
_onClick(event){const item=this.itemForNode((event.target));if(item&&this._delegate.isItemSelectable(item)){this.selectItem(item);}}
_onKeyDown(event){let selected=false;switch(event.key){case'ArrowUp':selected=this.selectPreviousItem(true,false);break;case'ArrowDown':selected=this.selectNextItem(true,false);break;case'PageUp':selected=this.selectItemPreviousPage(false);break;case'PageDown':selected=this.selectItemNextPage(false);break;}
if(selected){event.consume();}}
_totalHeight(){return this._offsetAtIndex(this._model.length);}
_indexAtOffset(offset){if(this._mode===UI.ListMode.NonViewport){throw'There should be no offset conversions in non-viewport mode';}
if(!this._model.length||offset<0){return 0;}
if(this._mode===UI.ListMode.VariousHeightItems){return Math.min(this._model.length-1,this._variableOffsets.lowerBound(offset,undefined,0,this._model.length));}
if(!this._fixedHeight){this._measureHeight();}
return Math.min(this._model.length-1,Math.floor(offset/this._fixedHeight));}
_elementAtIndex(index){const item=this._model.at(index);let element=this._itemToElement.get(item);if(!element){element=this._delegate.createElementForItem(item);this._itemToElement.set(item,element);}
return element;}
_offsetAtIndex(index){if(this._mode===UI.ListMode.NonViewport){throw'There should be no offset conversions in non-viewport mode';}
if(!this._model.length){return 0;}
if(this._mode===UI.ListMode.VariousHeightItems){return this._variableOffsets[index];}
if(!this._fixedHeight){this._measureHeight();}
return index*this._fixedHeight;}
_measureHeight(){this._fixedHeight=this._delegate.heightForItem(this._model.at(0));if(!this._fixedHeight){this._fixedHeight=UI.measurePreferredSize(this._elementAtIndex(0),this.element).height;}}
_select(index,oldItem,oldElement){if(oldItem===undefined){oldItem=this._selectedItem;}
if(oldElement===undefined){oldElement=this._itemToElement.get(oldItem)||null;}
this._selectedIndex=index;this._selectedItem=index===-1?null:this._model.at(index);const newItem=this._selectedItem;const newElement=this._selectedIndex!==-1?this._elementAtIndex(index):null;if(oldElement){UI.ARIAUtils.setSelected(oldElement,false);}
if(newElement){UI.ARIAUtils.setSelected(newElement,true);}
UI.ARIAUtils.setActiveDescendant(this.element,newElement);this._delegate.selectedItemChanged(oldItem,newItem,(oldElement),newElement);}
_findFirstSelectable(index,direction,canWrap){const length=this._model.length;if(!length){return-1;}
for(let step=0;step<=length;step++){if(index<0||index>=length){if(!canWrap){return-1;}
index=(index+length)%length;}
if(this._delegate.isItemSelectable(this._model.at(index))){return index;}
index+=direction;}
return-1;}
_findPageSelectable(index,direction){let lastSelectable=-1;const startOffset=this._offsetAtIndex(index);const viewportHeight=this.element.offsetHeight-1;while(index>=0&&index<this._model.length){if(this._delegate.isItemSelectable(this._model.at(index))){if(Math.abs(this._offsetAtIndex(index)-startOffset)>=viewportHeight){return index;}
lastSelectable=index;}
index+=direction;}
return lastSelectable;}
_reallocateVariableOffsets(length,copyTo){if(this._variableOffsets.length<length){const variableOffsets=new Int32Array(Math.max(length,this._variableOffsets.length*2));variableOffsets.set(this._variableOffsets.slice(0,copyTo),0);this._variableOffsets=variableOffsets;}else if(this._variableOffsets.length>=2*length){const variableOffsets=new Int32Array(length);variableOffsets.set(this._variableOffsets.slice(0,copyTo),0);this._variableOffsets=variableOffsets;}}
_invalidate(from,to,inserted){if(this._mode===UI.ListMode.NonViewport){this._invalidateNonViewportMode(from,to-from,inserted);return;}
if(this._mode===UI.ListMode.VariousHeightItems){this._reallocateVariableOffsets(this._model.length+1,from+1);for(let i=from+1;i<=this._model.length;i++){this._variableOffsets[i]=this._variableOffsets[i-1]+this._delegate.heightForItem(this._model.at(i-1));}}
const viewportHeight=this.element.offsetHeight;const totalHeight=this._totalHeight();const scrollTop=this.element.scrollTop;if(this._renderedHeight<viewportHeight||totalHeight<viewportHeight){this._clearViewport();this._updateViewport(Number.constrain(scrollTop,0,totalHeight-viewportHeight),viewportHeight);return;}
const heightDelta=totalHeight-this._renderedHeight;if(to<=this._firstIndex){const topHeight=this._topHeight+heightDelta;this._topElement.style.height=topHeight+'px';this.element.scrollTop=scrollTop+heightDelta;this._topHeight=topHeight;this._renderedHeight=totalHeight;const indexDelta=inserted-(to-from);this._firstIndex+=indexDelta;this._lastIndex+=indexDelta;return;}
if(from>=this._lastIndex){const bottomHeight=this._bottomHeight+heightDelta;this._bottomElement.style.height=bottomHeight+'px';this._bottomHeight=bottomHeight;this._renderedHeight=totalHeight;return;}
this._clearViewport();this._updateViewport(Number.constrain(scrollTop,0,totalHeight-viewportHeight),viewportHeight);}
_invalidateNonViewportMode(start,remove,add){let startElement=this._topElement;for(let index=0;index<start;index++){startElement=startElement.nextElementSibling;}
while(remove--){startElement.nextElementSibling.remove();}
while(add--){this.element.insertBefore(this._elementAtIndex(start+add),startElement.nextElementSibling);}}
_clearViewport(){if(this._mode===UI.ListMode.NonViewport){console.error('There should be no viewport updates in non-viewport mode');return;}
this._firstIndex=0;this._lastIndex=0;this._renderedHeight=0;this._topHeight=0;this._bottomHeight=0;this._clearContents();}
_clearContents(){this._topElement.style.height='0';this._bottomElement.style.height='0';this.element.removeChildren();this.element.appendChild(this._topElement);this.element.appendChild(this._bottomElement);}
_updateViewport(scrollTop,viewportHeight){if(this._mode===UI.ListMode.NonViewport){console.error('There should be no viewport updates in non-viewport mode');return;}
const totalHeight=this._totalHeight();if(!totalHeight){this._firstIndex=0;this._lastIndex=0;this._topHeight=0;this._bottomHeight=0;this._renderedHeight=0;this._topElement.style.height='0';this._bottomElement.style.height='0';return;}
const firstIndex=this._indexAtOffset(scrollTop-viewportHeight);const lastIndex=this._indexAtOffset(scrollTop+2*viewportHeight)+1;while(this._firstIndex<Math.min(firstIndex,this._lastIndex)){this._elementAtIndex(this._firstIndex).remove();this._firstIndex++;}
while(this._lastIndex>Math.max(lastIndex,this._firstIndex)){this._elementAtIndex(this._lastIndex-1).remove();this._lastIndex--;}
this._firstIndex=Math.min(this._firstIndex,lastIndex);this._lastIndex=Math.max(this._lastIndex,firstIndex);for(let index=this._firstIndex-1;index>=firstIndex;index--){const element=this._elementAtIndex(index);this.element.insertBefore(element,this._topElement.nextSibling);}
for(let index=this._lastIndex;index<lastIndex;index++){const element=this._elementAtIndex(index);this.element.insertBefore(element,this._bottomElement);}
this._firstIndex=firstIndex;this._lastIndex=lastIndex;this._topHeight=this._offsetAtIndex(firstIndex);this._topElement.style.height=this._topHeight+'px';this._bottomHeight=totalHeight-this._offsetAtIndex(lastIndex);this._bottomElement.style.height=this._bottomHeight+'px';this._renderedHeight=totalHeight;this.element.scrollTop=scrollTop;}}
self.UI=self.UI||{};UI=UI||{};UI.ListControl=ListControl;UI.ListDelegate=ListDelegate;UI.ListMode=ListMode;
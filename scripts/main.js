'use strict';

var scheduler = {
    
    columns: 3,
    
    hourStart: 7,
    hourEnd: 22,
    
    slotHeight: 20,
    slotBorder: 1,
    slotMargin: 1,
    
    slots: {},
    types: {},
    
    init: function() {
        var that = this;
        
        this.setHoursHTML();
        this.setColumnsHTML();
        
        $('#slots ul').sortable({
            placeholder: 'ui-state-highlight',
            cancel: '.empty',
            start: function(event, ui) {
                ui.placeholder.height(ui.item.height())
            }
        });
        
        if (!Object.keys(this.slots).length) {
            this.createEmptySlots((this.hourEnd - this.hourStart + 1) * 3);
        }
        
        this.setSlotsHTML();
        this.setTypesHTML();
        
        //Add a new type
        $('#add_new_type').off().on('click', function() {
            var name = $('#new_type').val();
            $('#new_type').val('');
            if (name.trim() !== '') {
                that.createType(name);
                that.setTypesHTML();
            }
        });
        
        //Output JSON code
        $('#save').off().on('click', function() {
            for (var i = 0; i < that.columns; i++) {
                that.saveSlotOrder(i);
            }
            var code = that.createSaveCode();
            $('#save_code').val(code);
        });
        
        //Load data from JSON code
        $('#load').off().on('click', function() {
            var code = $('#save_code').val();
            if (code) {
                that.load(code);
            }
        });
        
        //var code = '{"t":[[1,"Scheduler improvements","#90EE90",1],[2,"Math course","#8bc7ea",2],[3,"Advent of code","#f25c5c",3],[4,"Reading","#f6c442",4],[5,"Research","#f07bef",5]],"s":[[34,27,1,2,0],[36,28,3,2,0],[40,31,4,1,0],[55,25,5,2,0],[57,24,2,2,0],[60,21,4,1,0],[74,18,3,2,0],[81,14,1,3,0],[87,15,2,2,0],[89,20,1,2,0]]}';
        //this.load(code);
    },
    
    createSaveCode: function() {
        var data = {t: [], s: []};
        for (var id in this.types) {
            var type = [
                parseInt(id), 
                this.types[id].name, 
                this.types[id].color, 
                this.types[id].ord
            ];
            data.t.push(type);
        }
        for (var id in this.slots) {
            if (!this.slots[id].empty) {
                var slot = [
                    parseInt(id), 
                    this.slots[id].ord, 
                    this.slots[id].typeId, 
                    this.slots[id].size, 
                    this.slots[id].columnId
                ];
                data.s.push(slot);
            }
        }
        return JSON.stringify(data);
    },
    
    load: function(code) {
        var data = JSON.parse(code);
        this.slots = {};
        this.types = {};
        
        //Load types and slots
        for (var i = 0; i < data.t.length; i++) {
            this.types[data.t[i][0]] = {
                name: data.t[i][1],
                color: data.t[i][2],
                ord: data.t[i][3]
            };
        }
        for (var i = 0; i < data.s.length; i++) {
            this.slots[data.s[i][0]] = {
                ord: data.s[i][1],
                typeId: data.s[i][2],
                size: data.s[i][3],
                columnId: data.s[i][4]
            };
        }
        
        //Add in empty slots (they are removed from the code to keep it shorter)
        for (var i = 0; i < this.columns; i++) {
            var slots = this.getSlots(i);
            var ord = 0;
            for (var j = 0; j < slots.length; j++) {
                ++ord;
                if (ord < slots[j].ord) {
                    //Add empty slots above this slot..
                    for (var k = ord; k < slots[j].ord; k++) {
                        var id = this.getNextSlotId();
                        this.slots[id] = {empty: true, ord: ord++, columnId: i};
                    }
                }
            }
            //Add empty slots at the end
            var slots = this.getSlots(i);
            var count = ((this.hourEnd - this.hourStart + 1) * 3);
            for (var j = 0; j < slots.length; j++) {
                if (slots[j].size) {
                    count -= slots[j].size;
                } else {
                    count -= 1;
                }
            }
            for (var k = 0; k < count; k++) {
                var id = this.getNextSlotId();
                this.slots[id] = {empty: true, ord: ++ord, columnId: i};
            }
        }
        
        //Re-init
        this.init();
    },
    
    getNextTypeId: function() {
        var ids = Object.keys(this.types);
        return ids.length ? Math.max(...ids.map(Number)) + 1 : 1;
    },
    
    createType: function(name) {
        var type = {name: name, color: '#90EE90'};
        var id = this.getNextTypeId();
        
        //Set ord to last
        var types = this.getTypes();
        type.ord = types.length ? types[types.length - 1].ord + 1 : 1;
        
        this.types[id] = type;
        return id;
    },
    
    deleteType: function(typeId) {
        if (this.types[typeId]) {
            //Delete type
            delete this.types[typeId];
            
            //Delete slots in type
            for (var slotId in this.slots) {
                if (this.slots[slotId].typeId == typeId) {
                    this.updateSlotType(slotId, false);
                }
            }
            return true;
        }
        return false;
    },
    
    getTypes: function() {
        var types = [];
        for (var id in this.types) {
            var type = $.extend({}, this.types[id]);
            type.id = id;
            types.push(type);
        }
        types.sort(function(a, b) {
            return a.ord - b.ord;
        });
        return types;
    },
    
    setTypesHTML: function() {
        var that = this;
        var types = this.getTypes();
        
        var source = document.getElementById('type-template').innerHTML;
        var template = Handlebars.compile(source);
        var html = '';
        
        for (var i = 0; i < types.length; i++) {
            html += template(types[i]);
        }
        $('#types').html(html);
        
        $('#types .type').draggable({
            helper: function(event) {
                var typeId = $(event.currentTarget).data('id');
                return $('<div>', {
                    text: that.types[typeId].name, 
                    class: 'helper', 
                    style: 'background-color:' + that.types[typeId].color
                });
            },
            cursorAt: {top:10, left: 0}
        });
        
        $('#types .type .close').on('click', function() {
            var typeId = $(this).parent().parent().data('id');
            if (typeId && confirm('Are you sure you want to delete the type "' + that.types[typeId].name + '"?')) {
                
                that.deleteType(typeId);
                
                that.setTypesHTML();
                that.setSlotsHTML();
            }
        });
        
        $('#types .type input[type="color"]').on('change', function() {
            var typeId = $(this).parent().parent().data('id');
            that.types[typeId].color = $(this).val();
            
            that.setSlotsHTML();
        });
    },
    
    getNextSlotId: function() {
        var ids = Object.keys(this.slots);
        return ids.length ? Math.max(...ids.map(Number)) + 1 : 1;
    },
    
    updateSlotType: function(slotId, typeId) {
        var slot = {
            ord: this.slots[slotId].ord,
            columnId: this.slots[slotId].columnId
        };
        if (typeId) {
            slot.typeId = typeId;
            slot.size = 1;
        } else {
            slot.empty = true;
            //If changing slot to empty and the slot was larger than 1, add in empty slots
            var size = this.slots[slotId].size;
            if (size > 1) {
                this.createEmptySlots(size - 1, slotId);
            }
        }
        this.slots[slotId] = slot;
        return slotId;
    },
    
    getSlotMergeFields: function(slotId) {
        var slot = $.extend({}, this.slots[slotId]);
        slot.id = slotId;
        if (slot.typeId) {
            slot.cssClass = 'item';
            slot.name = this.types[slot.typeId].name;
            slot.color = this.types[slot.typeId].color;
        } else {
            slot.cssClass = 'empty';
        }
        
        //Get slot height
        if (slot.size) {
            slot.height = (this.slotHeight * slot.size) + (this.slotMargin * (slot.size - 1)) + (this.slotBorder * 2 * (slot.size - 1));
        } else {
            slot.height = this.slotHeight;
        }
        
        return slot;
    },
    
    getSlots: function(columnId) {
        var slots = [];
        for (var slotId in this.slots) {
            if (this.slots[slotId].columnId == columnId) {
                var slot = this.getSlotMergeFields(slotId);
                slots.push(slot);
            }
        }
        slots.sort(function(a, b) {
            return a.ord - b.ord;
        });
        return slots;
    },
    
    getSlotsHTML: function(columnId, slotId) {
        var source = document.getElementById('slot-template').innerHTML;
        var template = Handlebars.compile(source);
        var html = '';
        if (slotId) {
            var slot = this.getSlotMergeFields(slotId);
            html = template(slot);
        } else {
            var slots = this.getSlots(columnId);
            for (var i = 0; i < slots.length; i++) {
                html += template(slots[i]);
            }
        }
        return html;
    },
    
    setSlotsHTML: function() {
        var that = this;
        
        //Save existing slot order
        for (var i = 0; i < this.columns; i++) {
            that.saveSlotOrder(i);
            var html = this.getSlotsHTML(i);
            $('#column_' + i).html(html);
        }
        
        $('#slots .empty').droppable({
            accept: '.type',
            over: function(event, ui) {
                $(this).addClass('over');
            },
            out: function(event, ui) {
                $(this).removeClass('over');
            },
            drop: function(event, ui) {
                var $slot = $(this);
                var $type = $(ui.draggable[0]);
                
                that.updateSlotType($slot.data('id'), $type.data('id'));
                that.setSlotsHTML();
            }
        });
        
        
        var emptySlotCount;
        $('#slots .item').resizable({
            handles: 's',
            grid: [0, this.slotHeight + this.slotMargin + (this.slotBorder * 2)],
            start: function(event, ui) {
                //Set max height
                var slotId = $(this).data('id');
                var slot = that.slots[slotId];
                that.saveSlotOrder(slot.columnId);
                
                var slots = that.getSlots(slot.columnId);
                var passed = false;
                
                emptySlotCount = that.slots[slotId].size - 1;
                
                for (var i = 0; i < slots.length; i++) {
                    if (slots[i].id == slotId) {
                        passed = true;
                    } else if (passed) {
                        if (slots[i].empty) {
                            ++emptySlotCount;
                        } else {
                            break;
                        }
                    }
                }
                
                var maxHeight = ((emptySlotCount) * (that.slotHeight + that.slotMargin + (that.slotBorder * 2))) + that.slotHeight;
                $('#slots .item').resizable('option', 'maxHeight', maxHeight);
            },
            stop: function(event, ui) {
                //Remove max height
                $('#slots .item').resizable('option', 'maxHeight', null);
                //Re-init slot events
                that.setSlotsHTML();
            },
            resize: function(event, ui) {
                //Add / remove empty slots as slot is resized
                var $slot = $(this);
                var slotId = $slot.data('id');
                var slot = that.slots[slotId];
                var oldSize = slot.size;
                var newSize = (($slot.height() - that.slotHeight) / (that.slotHeight + that.slotMargin + (that.slotBorder * 2))) + 1;
                
                slot.size = newSize;
                
                if (newSize > oldSize) {
                    //When size is increased, remove the slot below
                    for (var j = oldSize; j < newSize; j++) {
                        var slots = that.getSlots(slot.columnId);
                        var passed = false;
                        for (var k = 0; k < slots.length; k++) {
                            if (slots[k].id == slotId) {
                                passed = true;
                            } else if (passed) {
                                if (slots[k].empty) {
                                    $('#slots li[data-id="' + slots[k].id + '"]').remove();
                                    delete that.slots[slots[k].id];
                                    break;
                                }
                            }
                        }
                    }
                } else if (newSize < oldSize) {
                    //When size is decreased, add an empty slot below
                    var count = oldSize - newSize;
                    that.createEmptySlots(count, slotId);
                }
            }
        });
        
        $('#slots .item .close').on('click', function() {
            var slotId = $(this).parent().data('id');
            that.updateSlotType(slotId, false);
            that.setSlotsHTML();
        });
    },
    
    //Either fills all columns with {count} slots
    //Or inserts {count} slots under slot {slotId}
    createEmptySlots: function(count, slotId) {
        for (var i = 0; i < this.columns; i++) {
            if (slotId) {
                var $el = $('#slots li[data-id="' + slotId + '"]');
                var columnId = this.slots[slotId].columnId;
            } else {
                var $el = $('#column_' + i);
                var columnId = i;
            }
            for (var j = 0; j < count; j++) {
                var id = this.getNextSlotId();
                this.slots[id] = {empty: true, ord: 0, columnId: columnId};
                
                //Get HTML for empty slot
                var html = this.getSlotsHTML(false, id);
                
                //Set HTML
                if (slotId) {
                    $el.after(html);
                } else {
                    $el.append(html);
                }
                
                //Save the order of the slots (so I don't have to manually calculate ordinals)
                this.saveSlotOrder(columnId);
            }
            if (slotId) {
                break;
            }
        }
    },
    
    saveSlotOrder: function(columnId) {
        var ord = 1;
        var slotIds = $('#column_' + columnId).sortable('toArray', {attribute: 'data-id'});        
        for (var i = 0; i < slotIds.length; i++) {
            if (this.slots[slotIds[i]]) {
                this.slots[slotIds[i]].ord = ord++;
            }
        }
    },
    
    setHoursHTML: function() {
        var html = '';
        for (var i = this.hourStart; i <= this.hourEnd; i++) {
            html += '<div class="hour">' + i + ':00</div>';
        }
        $('#hours').html(html);
    },
    
    setColumnsHTML: function() {
        var html = '';
        for (var i = 0; i < this.columns; i++) {
            html += '<ul id="column_' + i + '"></ul>';
        }
        $('#slots').html(html);
    }
    
};

scheduler.init();

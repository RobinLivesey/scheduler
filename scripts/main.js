'use strict';

var scheduler = {
    
    hourStart: 6,
    hourEnd: 22,
    
    slotHeight: 20,
    slotBorder: 1,
    slotMargin: 1,
    
    slots: {},
    types: {
        1: {ord: 1, name: 'Apple', color: '#FF8C00'},
        2: {ord: 2, name: 'Orange', color: '#9932CC'},
        3: {ord: 3, name: 'Pear', color: '#8B0000'},
    },
    
    init: function() {
        var that = this;
        
        this.setHoursHTML();
        
        $('#slots').sortable({
            placeholder: 'ui-state-highlight',
            cancel: '.empty',
            start: function(event, ui) {
                ui.placeholder.height(ui.item.height())
            }
        });
        
        if (!Object.keys(this.slots).length) {
            
            this.createEmptySlots((this.hourEnd - this.hourStart + 1) * 3);
        }
        
        this.setTypesHTML();
        this.setSlotsHTML();
        
        //Add a new type
        $('#add_new_type').on('click', function() {
            var name = $('#new_type').val();
            $('#new_type').val('');
            if (name.trim() !== '') {
                that.createType(name);
                that.setTypesHTML();
            }
        });
        
        $('#save').on('click', function() {
            var data = {s: that.slots, t: that.types};
            $('#save_json').html(JSON.stringify(data));
        });
    },
    
    createType: function(name) {
        var type = {name: name, color: '#90EE90'};
        
        //Set id to next unique
        var ids = Object.keys(this.types);
        var id = ids.length ? Math.max(...ids.map(Number)) + 1 : 1;
        
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
                return $('<div>', {text: that.types[typeId].name, class: 'test'});
            },
            handle: '.drag',
            cursorAt: {top:10, left: 0}
        });
        
        $('#types .type .close').on('click', function() {
            var typeId = $(this).parent().parent().data('id');
            that.deleteType(typeId);
            
            that.setTypesHTML();
            that.setSlotsHTML();
        });
        
        $('#types .type input[type="color"]').on('change', function() {
            var typeId = $(this).parent().parent().data('id');
            that.types[typeId].color = $(this).val();
            
            that.setSlotsHTML();
        });
    },
    
    updateSlotType: function(slotId, typeId) {
        var slot = {
            ord: this.slots[slotId].ord
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
    
    getSlots: function() {
        var slots = [];
        for (var slotId in this.slots) {
            var slot = this.getSlotMergeFields(slotId);
            slots.push(slot);
        }
        slots.sort(function(a, b) {
            return a.ord - b.ord;
        });
        return slots;
    },
    
    getSlotsHTML: function(slotId) {
        var source = document.getElementById('slot-template').innerHTML;
        var template = Handlebars.compile(source);
        var html = '';
        if (slotId) {
            var slot = this.getSlotMergeFields(slotId);
            html = template(slot);
        } else {
            var slots = this.getSlots();
            for (var i = 0; i < slots.length; i++) {
                html += template(slots[i]);
            }
        }
        return html;
    },
    
    setSlotsHTML: function() {
        var that = this;
        
        //Save existing slot order
        that.saveSlotOrder();
        var html = this.getSlotsHTML();
        $('#slots').html(html);
        
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
                that.saveSlotOrder();
                var slotId = $(this).data('id');
                var slots = that.getSlots();
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
                        var slots = that.getSlots();
                        var passed = false;
                        for (var i = 0; i < slots.length; i++) {
                            if (slots[i].id == slotId) {
                                passed = true;
                            } else if (passed) {
                                if (slots[i].empty) {
                                    $('#slots li[data-id="' + slots[i].id + '"]').remove();
                                    delete that.slots[slots[i].id];
                                    break;
                                }
                            }
                        }
                    }
                } else {
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
    
    createEmptySlots: function(count, slotId) {
        var $el = slotId ? $('#slots li[data-id="' + slotId + '"]') : $('#slots');
        for (var i = 0; i < count; i++) {
            var ids = Object.keys(this.slots);
            var id = ids.length ? Math.max(...ids.map(Number)) + 1 : 1;
            this.slots[id] = {empty: true, ord: 0};
            
            var html = this.getSlotsHTML(id);
            if (slotId) {
                $el.after(html);
            } else {
                $el.append(html);
            }
            
            this.saveSlotOrder();
        }
    },
    
    saveSlotOrder: function() {
        var ord = 1;
        var slotIds = $('#slots').sortable('toArray', {attribute: 'data-id'});        
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
    }
    
};

scheduler.init();

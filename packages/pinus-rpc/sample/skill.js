/**
 * 技能动作类
 */
var isNodeJS = 'undefined'!==typeof module;
//如果module没有定义，说明是客户端
if (isNodeJS){
    _ = require('underscore');
}

var SkillAction = {};
SkillAction.AttrArr = ['','wuLi','tongShuai','zhiLi','zhengZhi'];
SkillAction.wLayer = null;

/// 计算技能伤害
SkillAction.calDamage = function(equiper, equipObject, target, skill, addParas){
    var p = [];
    for(var i=0;i<17;i++){
        p[i] = 1;
    }
    p[0] = JueWei.getTroopsLimit(equiper.jueWei, equiper.shiLi);
    p[1] = equipObject.shiQi;
    p[2] = equipObject.getStatusAtkCoef();                     //攻方状态值
    switch(skill.attrType){
        case SKILL_DEF.ATTR_TYPE_WULI:
            p[3] = equiper.getWuLiZXL();      //攻方大将统率执行力
            break;
        case SKILL_DEF.ATTR_TYPE_TONGSHUAI:
            p[3] = equiper.getTongShuaiZXL();      //攻方大将统率执行力
            break;
        case SKILL_DEF.ATTR_TYPE_ZHILI:
            p[3] = equiper.getZhiLiZXL();      //攻方大将统率执行力
            break;
        case SKILL_DEF.ATTR_TYPE_ZHENGZHI:
            p[3] = equiper.getZhengZhiZXL();      //攻方大将统率执行力
            break;
    }
    if(target.wuJiang){
        switch(skill.attrType){
            case SKILL_DEF.ATTR_TYPE_WULI:
                p[4] = target.wuJiang.daJiang.getWuLiZXL();      //对方大将统率执行力
                break;
            case SKILL_DEF.ATTR_TYPE_TONGSHUAI:
                p[4] = target.wuJiang.daJiang.getTongShuaiZXL();      //对方大将统率执行力
                break;
            case SKILL_DEF.ATTR_TYPE_ZHILI:
                p[4] = target.wuJiang.daJiang.getZhiLiZXL();      //对方大将统率执行力
                break;
            case SKILL_DEF.ATTR_TYPE_ZHENGZHI:
                p[4] = target.wuJiang.daJiang.getZhengZhiZXL();      //对方大将统率执行力
                break;
        }
    } else {
        p[4] = target.getDJZXL(SkillAction.AttrArr[skill.attrType]);
    }
    p[5] = SkillAction.wLayer.techs[equipObject.force].getLineupEffect(equipObject._lineup.id);   //攻击方阵型成长
    p[6] = SkillAction.wLayer.techs[equipObject.force].getCastleEffect();
    p[7] = target.shiQi;
    p[8] = target.getStatusAtkCoef();            //守方状态值
    p[9] = target.def;
    p[10] = SkillAction.wLayer.techs[target.force].getLineupEffect(target._lineup.id);
    p[11] = SkillAction.wLayer.techs[target.force].getCastleEffect();
    if(target.type===MAP_DEF.TYPE_UNIT){
        p[14] = 2;
    } else {
        p[12] = target.durable;
        p[13] = target.getDurableMax();
        p[14] = 1;
    }
    if(addParas['atkType']){
        p[15] = addParas['atkType'];
    } else {
        p[15] = 0;
    }
    p[16] = skill.power;
    return FOMULA.skillhurt(p);
};

/// 计算军师技能伤害
SkillAction.calAdviserDamage = function(equiper, equipObject, target, skill, addParas){
    var p = [];
    p[0] = equipObject;
    p[1] = target;
    p[2] = skill;
    p[3] = equiper;
    return FOMULA.junshiskillhurt(p);
};

/// 循环遍历范围内的cell cells为可选参数，如果传入则不调用scopeCells
SkillAction.scopeLoop = function(cx, cy, cs, cb, cells){
    if(!cells){
        cells = SkillAction.wLayer.map.scopeCellsByTileXY(cx, cy, cs, true);
    }
    var visitedObjs = [];
    for(var i=0;i<cells.length;i++){
        //_.log(i, cells[i].cx, cells[i].cy);
        var objs = cells[i].objects;
        if(objs){
            for (var j = 0; j < objs.length; j++) {
                var obj = objs[j];
                //_.log(obj.name);
                if(visitedObjs.indexOf(obj)===-1){
                    visitedObjs.push(obj);
                    var breakFlag = cb(obj);
                    if(breakFlag){
                        break;
                    }
                }
            }
        }
    }
};

SkillAction.initTileNodes = function(cx, cy, cs) {
    var map = SkillAction.wLayer.map;
    var node = new cc.Node();
    var cells = map.scopeCellsByTileXY(cx, cy, cs, true);
    var centerMapPos = map.tile2map(cx, cy);
    node.x = centerMapPos[0];
    node.y = centerMapPos[1];
    SkillAction.wLayer._bgEffNode.addChild(node);
    for (var i = 0; i < cells.length; i++) {
        var cellPos = map.tile2map(cells[i].cx, cells[i].cy);
        var tileNode = new TileNode(SkillAction.wLayer);
        tileNode.x = cellPos[0] - centerMapPos[0];
        tileNode.y = cellPos[1] - centerMapPos[1];
        tileNode.changeColor(TILE_DEF.COLOR_RED);
        node.addChild(tileNode, 0);
        //this._tileNodes[i] = tileNode;
    }

    return node;
};

/// 寻找包裹路径的格子
SkillAction.findCellsAroundPath = function(path){
    var cellsMap = {};
    for(var i=0;i<path.length;i++){
        var cell = path[i];
        if(!cellsMap[cell.cx+'_'+cell.cy]){
            cellsMap[cell.cx+'_'+cell.cy] = cell;
        }
        var cells = SkillAction.wLayer.map.scopeCells(cell.cx, cell.cy, 1, false);
        for(var j=0;j<cells.length;j++){
            var ocell = cells[j];
            if(!cellsMap[ocell.cx+'_'+ocell.cy]){
                cellsMap[ocell.cx+'_'+ocell.cy] = ocell;
            }
        }
    }
    var cells = [];
    for(var key in cellsMap){
        cells.push(cellsMap[key]);
    }
    return cells;
};

SkillAction.checkTargetBeDebuff = function(target){
    return CONFLICT.checkByTask(target, 'beDebuff');
};

/// 检验技能影响类型
SkillAction.checkAffectType = function(target, self, action){
    var ret;
    switch (action.affectType) {
        case SKILL_DEF.AFFECT_ENEMY:
            ret = target.force!==self.force;
            break;
        case SKILL_DEF.AFFECT_FRIEND:
            ret = target.force===self.force;
            break;
        case SKILL_DEF.AFFECT_BOTH:
            ret = true;
            break;
        case SKILL_DEF.AFFECT_SELF:
            ret = target.force===self.force;
            break;
        case SKILL_DEF.AFFECT_TARGET:
            ret = target.force!==self.force;
            break;
    }
    return ret;
};

/// 技能影响目标类型
//SkillAction.checkObjectType = function(target){ //技能不对经济建筑起作用
//    return !SkillAction.wLayer.ecoBuildingMgr.checkEcoBuilding(target);
//};

/// 根据action的TargetType获取action的target
SkillAction.getActionTarget = function(target, action){
    var ret = null;
    switch (action.targetType){
        case SKILL_DEF.TARGET_ARMY:
            if(target.type===MAP_DEF.TYPE_UNIT){
                ret = target;
            }
            break;
        case SKILL_DEF.TARGET_BUILDING:
            if(target.type===MAP_DEF.TYPE_BUILDING_PORT ||target.type===MAP_DEF.TYPE_BUILDING_GATE ||
                target.type===MAP_DEF.TYPE_BUILDING_CASTLE || SkillAction.wLayer.workpieceMgr.checkWorkPiece(target)){
                ret = target;
            }
            break;
        case SKILL_DEF.TARGET_ECO:
            if(SkillAction.wLayer.ecoBuildingMgr.checkEcoBuilding(target)){
                ret = target;
            }
            break;
        case SKILL_DEF.TARGET_ARMY_WJ:
            if(target.type===MAP_DEF.TYPE_UNIT){
                ret = target.wuJiang.getWuJiangs();
            }
            break;
        case SKILL_DEF.TARGET_BUILDING_WJ:
            if(target.type===MAP_DEF.TYPE_BUILDING_PORT ||target.type===MAP_DEF.TYPE_BUILDING_GATE ||
                target.type===MAP_DEF.TYPE_BUILDING_CASTLE || SkillAction.wLayer.workpieceMgr.checkWorkPiece(target)){
                ret = target.pML.wuJiangMgr.getWJBySuoShu(target.objID);
            }
            break;
        case SKILL_DEF.TARGET_TROOPS:
            if(target.type===MAP_DEF.TYPE_BUILDING_PORT ||target.type===MAP_DEF.TYPE_BUILDING_GATE || target.type===MAP_DEF.TYPE_UNIT ||
                target.type===MAP_DEF.TYPE_BUILDING_CASTLE || SkillAction.wLayer.workpieceMgr.checkWorkPiece(target)){
                ret = target;
            }
            break;
    }
    return ret;
};

/// 绑定一次技能
SkillAction.bindSkillOnce = function(paras) {
    var target = paras[0];  //技能目标
    var equiper = paras[1]; //技能装备的武将
    var equipObject = paras[2]; //使用技能的军队或建筑
    var skill = paras[3];   //技能名称
    var addParas = paras[4];    //技能附加参数对象
    var action = paras[5];
    var skillID = addParas['skillID'];
    var dj = target.getSatrap();    //获得目标的大将，并创建一个新技能给那个对象
    var newSkill = SkillAction.wLayer.skillMgr.createSkill(skillID, dj, null, true, target);    //添加给新武将使用一次的军师技能
    _.log('bindSkillOnce', target.name);
    if(newSkill.needTouch()){
        SkillAction.wLayer._selectedSkill = newSkill;
        if(!newSkill.checkIsAdviser()){   //军师技能此处不添加施法范围
            newSkill.equipObject.setTileNodesVisible(true);
        }
    } else {
        newSkill.cast(null);
    }
};

/// 添加buff
SkillAction.addBuff = function(paras) {
    var target = paras[0];  //技能目标
    var equiper = paras[1]; //技能装备的武将
    var equipObject = paras[2]; //使用技能的军队或建筑
    var skill = paras[3];   //技能名称
    var addParas = paras[4];    //技能附加参数对象
    var action = paras[5];
    var buffID = addParas['buffID'];
    _.log('SkillAction addbuff', action.condition);
    if(buffID>=10000&&buffID<=99999){   //如果buffid只有5位，则补上玩家的等级作为buff等级
        buffID = buffID*100+USER.level;
    }
    //var buffArg = addParas['args'][0];  //buff通常只取第一个参数
    var duration = addParas['duration'] || skill.duration;  //如果action有duration则取action的 否则取skill的

    SkillAction.scopeLoop(target.cx, target.cy, skill.scope, function(obj){
        if (SkillAction.checkAffectType(obj, equipObject, action)) {
            //如果有buffid 且每个target满足action的条件
            if(buffID!==undefined && (!action.condition || action.condition && SkillCondition[action.condition](obj, equiper, equipObject, skill, action))){
                var realTarget = SkillAction.getActionTarget(obj, action);
                if(realTarget){
                    if(realTarget instanceof Array){    //如果是数组类型，则说明取到的是武将
                        for(var i=0;i<realTarget.length;i++){
                            if(duration!==0){
                                SkillAction.wLayer.buffMgr.addBuff(buffID, realTarget[i], duration * _.TIME.SEC);
                            } else {    //如果没有duration 则取buff默认的duration
                                SkillAction.wLayer.buffMgr.addBuff(buffID, realTarget[i]);
                            }
                        }
                    } else {      //否则是建筑或军队，直接加buff
                        if(duration!==0){
                            SkillAction.wLayer.buffMgr.addBuff(buffID, realTarget, duration*_.TIME.SEC);
                        } else {    //如果没有duration 则取buff默认的duration
                            SkillAction.wLayer.buffMgr.addBuff(buffID, realTarget);
                        }
                    }
                }
            }
        }
    });
};

/// 单体技能伤害
SkillAction.skillhurt = function(paras){
    var target = paras[0];  //技能目标
    var equiper = paras[1]; //技能装备的武将
    var equipObject = paras[2]; //使用技能的军队或建筑
    var skill = paras[3];   //技能名称
    var addParas = paras[4];    //技能附加参数对象
    if(SkillAction.checkTargetBeDebuff(target)){
        var damage = SkillAction.calDamage(equiper, equipObject, target, skill, addParas);
        _.log('skillhurt',damage);
        SkillAction.attackAction(damage, equipObject, target, ARMY_DEF.DAMAGE_TYPE_NORMAL);
        //target.changeTroops(-damage);
    }
};

/// 击退
SkillAction.beatBack = function(paras){
    var target = paras[0];  //技能目标
    var equiper = paras[1]; //技能装备的武将
    var equipObject = paras[2]; //使用技能的军队或建筑
    var skill = paras[3];   //技能名称
    var addParas = paras[4];    //技能附加参数对象
    if(SkillAction.checkTargetBeDebuff(target)){
        var damage = SkillAction.calDamage(equiper, equipObject, target, skill, addParas);
        //_.log('beatBack',damage);
        SkillAction.attackAction(damage, equipObject, target, ARMY_DEF.DAMAGE_TYPE_NORMAL);
        //target.changeTroops(-damage);
        var dx = target.x - equipObject.x;
        var dy = (target.y - equipObject.y)*GRID_WH;
        //_.log('beatBack',dx, dy);
        var dir = WORLD.getFaceXyDir(dx, dy);
        var neighbor = equipObject.pMap.getNeighbor(target.cx, target.cy, WORLD.getNeighborDirByFaceDir(dir));
        target.transferToTile(neighbor.cx, neighbor.cy);
    }
};

/// 恢复友军武将受伤状态
SkillAction.cureInjury = function(paras) {
    var target = paras[0];  //技能目标
    var equiper = paras[1]; //技能装备的武将
    var equipObject = paras[2]; //使用技能的军队或建筑
    var skill = paras[3];   //技能名称
    var addParas = paras[4];    //技能附加参数对象
    var action = paras[5];

    SkillAction.scopeLoop(target.cx, target.cy, skill.scope, function(obj){
        if (SkillAction.checkAffectType(obj, equipObject, action)) {
            var wjs = [];
            if(obj.type===MAP_DEF.TYPE_UNIT){
                wjs = obj.wuJiang.getWuJiangs();
            }
            for(var i=0;i<wjs.length;i++){
                var wj = wjs[i];
                if(!wj.checkHealthy()){
                    wj.setJianKang(WJ_DEF.JIAN_KANG);
                }
            }
        }
    });
};

/// 驱散友军debuff
SkillAction.refresh = function(paras) {
    var target = paras[0];  //技能目标
    var equiper = paras[1]; //技能装备的武将
    var equipObject = paras[2]; //使用技能的军队或建筑
    var skill = paras[3];   //技能名称
    var addParas = paras[4];    //技能附加参数对象
    var action = paras[5];
    var buffMgr = equipObject.pML.buffMgr;
    SkillAction.scopeLoop(target.cx, target.cy, skill.scope, function(obj){
        if (SkillAction.checkAffectType(obj, equipObject, action)) {
            if(obj.type===MAP_DEF.TYPE_UNIT){
                var buffs = buffMgr.buffList[obj.objID];
                if(buffs && buffs.length>0){
                    for(var i=0;i<buffs.length;i++){
                        var buff = buffs[i];
                        if(buff.mode === BUFF_DEF.MODE_DEBUFF){
                            buff.removeSelf();
                        }
                    }
                }
            }

        }
    });
};

/// 嘲讽周围部队
SkillAction.taunt = function(paras) {
    var target = paras[0];  //技能目标
    var equiper = paras[1]; //技能装备的武将
    var equipObject = paras[2]; //使用技能的军队或建筑
    var skill = paras[3];   //技能名称
    var addParas = paras[4];    //技能附加参数对象
    var action = paras[5];
    var targets = [];   //被嘲讽的目标数组
    SkillAction.scopeLoop(target.cx, target.cy, skill.scope, function(obj){
        if (SkillAction.checkAffectType(obj, equipObject, action)) {
            if(obj.type===MAP_DEF.TYPE_UNIT){
                obj.setTarget(equipObject);
                targets.push(obj);
                if(obj.emitter){
                    obj.emitter.emit('beTaunt', {'target':equipObject});
                }
            }

        }
    });

    if(this.equipObject.emitter){
        this.equipObject.emitter.emit('taunt', {'targets':targets});
    }
};

/// 范围伤害
SkillAction.adviserAoe = function(paras){
    _.log('adviserAoe')
    var target = paras[0];  //技能目标
    var equiper = paras[1]; //技能装备的武将
    var equipObject = paras[2]; //使用技能的军队或建筑
    var skill = paras[3];   //技能名称
    var addParas = paras[4];    //技能附加参数对象
    var action = paras[5];
    SkillAction.scopeLoop(target.cx, target.cy, skill.scope, function(obj){
        if (obj.force !== equiper.shiLi && SkillAction.checkTargetBeDebuff(obj)) {
            var realTarget = SkillAction.getActionTarget(obj, action);
            if(realTarget){
                var damage = SkillAction.calAdviserDamage(equiper, equipObject, obj, skill, addParas);
                _.log('adviserAoe', damage, obj.name);
                //obj.changeTroops(-damage);
                SkillAction.attackAction(damage, equipObject, obj, ARMY_DEF.DAMAGE_TYPE_NORMAL);
            }
        }
    });
};

/// 军师技能范围伤害
SkillAction.aoe = function(paras){
    var target = paras[0];  //技能目标
    var equiper = paras[1]; //技能装备的武将
    var equipObject = paras[2]; //使用技能的军队或建筑
    var skill = paras[3];   //技能名称
    var addParas = paras[4];    //技能附加参数对象
    var action = paras[5];
    SkillAction.scopeLoop(target.cx, target.cy, skill.scope, function(obj){
        if (SkillAction.checkAffectType(obj, equipObject, action) && SkillAction.checkTargetBeDebuff(obj)) {
            var damage = SkillAction.calDamage(equiper, equipObject, obj, skill, addParas);
            _.log('aoe', damage, obj.name);
            //obj.changeTroops(-damage);
            SkillAction.attackAction(damage, equipObject, obj, ARMY_DEF.DAMAGE_TYPE_NORMAL);
        }
    });
};

/// 齐攻
SkillAction.linkAtk = function(paras){
    var target = paras[0];  //技能目标
    var equiper = paras[1]; //技能装备的武将
    var equipObject = paras[2]; //使用技能的军队或建筑
    var skill = paras[3];   //技能名称
    var addParas = paras[4];    //技能附加参数对象
    if(SkillAction.checkTargetBeDebuff(target)) {
        SkillAction.scopeLoop(target.cx, target.cy, skill.scope, function(obj){
            if (obj.force === equipObject.force && typeof obj.type===MAP_DEF.TYPE_UNIT) {
                var damage = SkillAction.calDamage(equiper, obj, target, skill, addParas);
                _.log('linkAtk', damage, obj.name);
                //target.changeTroops(-damage);
                SkillAction.attackAction(damage, obj, target, ARMY_DEF.DAMAGE_TYPE_NORMAL);
            }
        });
    }
};

/// 持续性范围伤害技能
SkillAction.dotaoe = function(paras){
    var target = paras[0];  //技能目标
    var equiper = paras[1]; //技能装备的武将
    var equipObject = paras[2]; //使用技能的军队或建筑
    var skill = paras[3];   //技能名称
    var addParas = paras[4];    //技能附加参数对象
    var interval = addParas['interval'];
    //cx cy oriForce 需要先缓存下来，因为随着时间的推移可能会变化
    var cx = target.cx;
    var cy = target.cy;
    var oriForce = equipObject.force;
    var cells = SkillAction.wLayer.map.scopeCellsByTileXY(cx, cy, skill.scope, true);
    var tileNode = SkillAction.initTileNodes(cx, cy, skill.scope);
    SkillAction.wLayer.setTimeMechine(null, skill.duration* _.TIME.SEC, interval* _.TIME.SEC, function(){
        SkillAction.scopeLoop(cx, cy, skill.scope, function(obj){
            if (obj.force !== oriForce && typeof obj.changeTroops==='function') {
                if(SkillAction.checkTargetBeDebuff(obj)) {
                    var damage = SkillAction.calDamage(equiper, equipObject, obj, skill, addParas);
                    _.log('dotaoe', damage, obj.name);
                    SkillAction.attackAction(damage, equipObject, obj, ARMY_DEF.DAMAGE_TYPE_NORMAL);
                    //obj.changeTroops(-damage);
                }
            }
        }, cells);
    }, function(){
        //_.log('dotaoe finish');
        tileNode.removeFromParent(true);
    });
};

/// 持续性影响的action
SkillAction.dot = function(paras){
    var target = paras[0];  //技能目标
    var equiper = paras[1]; //技能装备的武将
    var equipObject = paras[2]; //使用技能的军队或建筑
    var skill = paras[3];   //技能名称
    var addParas = paras[4];    //技能附加参数对象
    var interval = addParas['interval'];
    var funcName = addParas['function'];
    var paras = addParas['args'];
    SkillAction.wLayer.setTimeMechine(null, skill.duration* _.TIME.SEC, interval* _.TIME.SEC, function(){
        if(SkillAction.checkTargetBeDebuff(target)) {
            var damage = target[funcName](paras);
            SkillAction.attackAction(damage, equipObject, target, ARMY_DEF.DAMAGE_TYPE_NORMAL);
        }
    }, function(){

    });
};

/// 使已经陷入混乱的军队延长混乱时间
SkillAction.continueHunluan = function(paras){
    var target = paras[0];  //技能目标
    var equiper = paras[1]; //技能装备的武将
    var equipObject = paras[2]; //使用技能的军队或建筑
    var skill = paras[3];   //技能名称
    var addParas = paras[4];    //技能附加参数对象
    SkillAction.scopeLoop(target.cx, target.cy, skill.scope, function(obj){
        if (obj.force !== equipObject.force && obj.buffStatus===ARMY_DEF.BUFF_STATUS_HUNLUAN) { //对已经混乱的目标继续释放混乱
            //_.log('continueHunluan',obj.name);
            if(SkillAction.checkTargetBeDebuff(obj)) {
                var p = [obj, equiper, equipObject, skill.name, addParas['buffID'], addParas['fomulaID'], addParas['durationID']];
                Action.addHunLuan(p);
            }
        }
    });
};

/// 使火焰中的军队变为混乱
//SkillAction.fireHunluan = function(paras){
//    var target = paras[0];  //技能目标
//    var equiper = paras[1]; //技能装备的武将
//    var equipObject = paras[2]; //使用技能的军队或建筑
//    var skill = paras[3];   //技能名称
//    var addParas = paras[4];    //技能附加参数对象
//    var visitedObjs = [];
//    var cells = SkillAction.wLayer.map.scopeCellsByTileXY(target.cx, target.cy, skill.scope, true);
//    for(var i=0;i<cells.length;i++){
//        //_.log(i, cells[i].cx, cells[i].cy);
//        var objs = cells[i].objects;
//        if(objs){
//            for (var j = 0; j < objs.length; j++) {
//                var obj = objs[j];
//                //_.log(obj.name);
//                if(visitedObjs.indexOf(obj)===-1){
//                    visitedObjs.push(obj);
//                    var breakFlag = cb(obj);
//                    if(breakFlag){
//                        break;
//                    }
//                }
//            }
//        }
//    }
//};

/// 士气变化
SkillAction.changeShiQi = function(paras){
    var target = paras[0];  //技能目标
    var equiper = paras[1]; //技能装备的武将
    var equipObject = paras[2]; //使用技能的军队或建筑
    var skill = paras[3];   //技能
    var addParas = paras[4];    //技能附加参数对象
    var action = paras[5];
    var fomulaID = addParas['fomulaID'];
    SkillAction.scopeLoop(target.cx, target.cy, skill.scope, function(obj){
        if (SkillAction.checkAffectType(obj, equipObject, action) && !isNaN(obj.shiQi)) {
            var p = [equipObject, obj, skill, equiper,addParas['isBeishui']];
            var shiqi = FOMULA.run(fomulaID, p);
            if(isNaN(shiqi)){
                return ;
            }
            if (shiqi > 0) {				
            	var frames = cc.getAnimFrames('skill/shiqi/up/%d.png');
            	var upEffect = cc.createAni({anchor : [0.5, 0.5]}, 3, cc.director.getAnimationInterval()*frames.length, frames);
            	upEffect.setPosition(cc.p(0.0, 0.0));
            	upEffect.then(function() {
            		upEffect.removeFromParent(true);
            	}).act();
            	obj.addEffectChildUp(upEffect);
            } else {
            	var frames = cc.getAnimFrames('skill/shiqi/down/%d.png');
            	var downEffect = cc.createAni({anchor : [0.5, 0.5]}, 3, cc.director.getAnimationInterval()*frames.length, frames);
            	downEffect.setPosition(cc.p(0.0, 0.0));
            	downEffect.then(function() {
            		downEffect.removeFromParent(true);
            	}).act();
            	obj.addEffectChildUp(downEffect);
            }
            obj.changeShiQi(shiqi);
        }
    });
};

///吸血 将敌方损失部队加到我军上
SkillAction.suckBlood = function(paras){
    var target = paras[0];  //技能目标
    var equiper = paras[1]; //技能装备的武将
    var equipObject = paras[2]; //使用技能的军队或建筑
    var skill = paras[3];   //技能名称
    var addParas = paras[4];    //技能附加参数对象
    if(!CONFLICT.checkByTask(target, 'beDebuff')){
        return ;
    }

    var damage = SkillAction.calDamage(equiper, equipObject, target, skill, addParas);
    _.log('suckBlood '+damage);
    if(damage>0){
        SkillAction.attackAction(damage, equipObject, target, ARMY_DEF.DAMAGE_TYPE_NORMAL);
        //target.changeTroops(-damage);
        if(equipObject.wuJiang){   //如果是部队则进行限制，如果是城池则不做限制
            var jwID = equipObject.wuJiang.daJiang.jueWei;
            var troopsLimit = JueWei.getTroopsLimit(jwID, equipObject.force);
            if(troopsLimit - equipObject.troops < damage){ //如果超出主将带兵上限，则修改为达到带兵上限
                damage = Math.max(troopsLimit - equipObject.troops, 0);
            }
        }
//        equipObject.changeTroops(damage);
        SkillAction.doDamage(equipObject, damage);
    }
};

///治疗 恢复伤兵
SkillAction.cure = function(paras) {
    var target = paras[0];  //技能目标
    var equiper = paras[1]; //技能装备的武将
    var equipObject = paras[2]; //使用技能的军队或建筑
    var skill = paras[3];   //技能名称
    var addParas = paras[4];    //技能附加参数对象
    var fomulaID = addParas['fomulaID'];

    SkillAction.scopeLoop(target.cx, target.cy, skill.scope, function(obj){
        if (obj.force === equipObject.force && !isNaN(obj.wounded) && !isNaN(obj.troops)) {
            var fomulaP = [];
            fomulaP[0] = equipObject;
            fomulaP[1] = obj;
            fomulaP[2] = skill;
            fomulaP[3] = equiper;
            var cureTroops = Math.round(FOMULA.run(fomulaID, fomulaP));
            //_.log('治疗：'+cureTroops+' '+selfArmy.name+' 对 '+target.name);
//            obj.changeTroops(cureTroops);
//            obj.changeWounded(-cureTroops);
            SkillAction.doDamage(obj, cureTroops);
        }
    });
};

/// 内讧，让范围内的敌人互相攻击
SkillAction.convert = function(paras){
    var target = paras[0];  //技能目标
    var equiper = paras[1]; //技能装备的武将
    var equipObject = paras[2]; //使用技能的军队或建筑
    var skill = paras[3];   //技能名称
    var addParas = paras[4];    //技能附加参数对象
    var oriForceMap = {};   //存储被改变force军队的原始force
    var oriObjArr = [];   //存储被改变force军队的obj
    var startIdx = 1;
    //先搜索附近是否有能够转移目标的军队
    SkillAction.scopeLoop(target.cx, target.cy, skill.scope, function(obj){
        if (obj.force !== equipObject.force && obj.type===MAP_DEF.TYPE_UNIT) {
            oriForceMap[obj.objID] = obj.force;
            oriObjArr.push(obj);
            obj.force = 1100000+startIdx;
            startIdx++;
        }
    });
    for(var i=0;i<oriObjArr.length;i++){
        var obj = oriObjArr[i];
        var others = _(oriObjArr).without(obj);
        if(others.length>0){
            var idx = _.rand(others.length);    //随机选一个目标
            obj.setTarget(others[idx]);
        }
    }
    SkillAction.wLayer.setTimeMechine(null, skill.duration*_.TIME.SEC, null, null, function(){
        _(oriObjArr).each(function(v, k){
            v.force = oriForceMap[v.objID];
            v.findAttackZoneFitEnemy();
        })
    });
};

/// 骄兵，让敌人出兵来攻打
SkillAction.jiaobing = function(paras){
    var target = paras[0];  //技能目标
    var equiper = paras[1]; //技能装备的武将
    var equipObject = paras[2]; //使用技能的军队或建筑
    var skill = paras[3];   //技能名称
    var addParas = paras[4];    //技能附加参数对象
    var newTarget;
    //先搜索附近是否有能够转移目标的军队
    SkillAction.scopeLoop(target.cx, target.cy, addParas['findEnemyScope'], function(obj){
        if (obj.force === equipObject.force) {
            newTarget = obj;
            return true;
        }
        return false;
    });
    if(newTarget){
        //吸引敌军
        SkillAction.scopeLoop(target.cx, target.cy, skill.scope, function(obj){
            if (obj.force !== equipObject.force) {
                _.log(obj.name, newTarget.name, obj.type);
                if(obj.type===MAP_DEF.TYPE_UNIT){
                    obj.setTarget(newTarget);
                }else if(obj.type===MAP_DEF.TYPE_BUILDING_CASTLE) {
                    CastleCmd.forceOutArmyFromCity(obj, newTarget);
                }
            }
        });
        //消灭自己
//        equipObject.changeTroops(-equipObject.troops-1);
        SkillAction.doDamage(equipObject, -equipObject.troops - 1);
    }
};

/// 点火
SkillAction.addFire = function(paras){
    var target = paras[0];  //技能目标
    var equiper = paras[1]; //技能装备的武将
    var equipObject = paras[2]; //使用技能的军队或建筑
    var skill = paras[3];   //技能名称
    var addParas = paras[4];    //技能附加参数对象
    SkillAction.scopeLoop(target.cx, target.cy, skill.scope, function(obj){
        if(obj.type===MAP_DEF.TYPE_BUILDING_TINDER){
            //var origin = role.origin || role;
            var info = {
                name: "火苗",
                type: MAP_DEF.TYPE_FIRE_FRAME,
                level: 1,
                //origin: origin,
                cx: obj.cx,
                cy: obj.cy,
                x: obj.x,
                y: obj.y,
                force: obj.force,
                keepAlive:WORLD.constConfig['fire_time']
            };
            SkillAction.wLayer.fireMgr.addSkillFire(info);
            obj.destroy();
        } else if(obj.type===MAP_DEF.TYPE_BUILDING_TRAP_FIRE){
            obj.lightBySkill();
        }
    });
};

/// 灭火
SkillAction.clearFire = function(paras){
    var target = paras[0];  //技能目标
    var equiper = paras[1]; //技能装备的武将
    var equipObject = paras[2]; //使用技能的军队或建筑
    var skill = paras[3];   //技能名称
    var addParas = paras[4];    //技能附加参数对象
    //_.log('clearFire',skill.scope, target.name);
    SkillAction.scopeLoop(target.cx, target.cy, skill.scope, function(obj){
        //_.log(obj.type);
        if(obj.type===MAP_DEF.TYPE_FIRE_FRAME){     //如果是火苗，则熄灭该火苗
            SkillAction.wLayer.fireMgr.clearFireFrame(obj.fireId);
        }
    });
};

/// 合兵
SkillAction.fuse = function(paras){
    var target = paras[0];  //技能目标
    var equiper = paras[1]; //技能装备的武将
    var equipObject = paras[2]; //使用技能的军队或建筑
    var skill = paras[3];   //技能名称
    var addParas = paras[4];    //技能附加参数对象
    //_.log('clearFire',skill.scope, target.name);
    var smallestArmy;
    var smallestTroops = 99999999;
    SkillAction.scopeLoop(target.cx, target.cy, skill.scope, function(obj){
        _.log(obj.name);
        if(obj.type===MAP_DEF.TYPE_UNIT && obj!==equipObject && obj.force===equipObject.force && obj.troops>0 && obj.troops<smallestTroops){
            if(SkillAction.checkTargetBeDebuff(obj)) {
                smallestTroops = obj.troops;
                smallestArmy = obj;
            }
        }
    });
    if(smallestArmy){
//        target.changeTroops(smallestArmy.troops);
//        target.changeWounded(smallestArmy.wounded);
        SkillAction.doDamage(target, smallestArmy.troops, smallestArmy.wounded);
        smallestArmy.destroy();
    }
};

/// 攻击action 用于发射消息和改变兵力
SkillAction.attackAction = function(damage, attacker, target, damageType){
    var info = {
        damage: damage,    //伤害
        attacker: attacker,    //伤害来源
        target: target,    //受到伤害的目标
        atkType: ARMY_DEF.ATK_TYPE_SKILL,  //攻击类型
        damageType: damageType?damageType:ARMY_DEF.DAMAGE_TYPE_NORMAL     //伤害类型
    };
    if(attacker && attacker.emitter){
        attacker.emitter.emit('armyAttack', info);
    }
    if(target && target.emitter){
        target.emitter.emit('armyBeAttack', info);
    }
//    target.changeTroops(-info.damage);
    SkillAction.doDamage(target, -info.damage);
};

//加血减血效果
SkillAction.doDamage = function(target, damage, wounded) {
	if (damage < 0) {
		//减血
		target.changeTroops(damage);
		ccs.armatureDataManager.addArmatureFileInfo("res/animation/jineng_shanghai/jineng_shanghai.ExportJson");

		var armature = new ccs.Armature("jineng_shanghai");

		//damage label
		armature.getBone("Layer3").removeDisplay(0);
		var damageNode = new cc.Node();
		var originX = 37;
		var numX = originX;
		var damageCount = Math.abs(damage);
		while (damageCount !== 0) {
			var num = damageCount%10;
			var numSpr = cc.createSprite("yellow_" + num + ".png", {anchor:[0.5, 0.5]});
			numSpr.x = numX;
			damageNode.addChild(numSpr);
			numX -= 25;
			damageCount = (damageCount - num)/10;
		}
		var minusSpr = cc.createSprite("yellow_-.png", {anchor:[0.5, 0.5]});
		minusSpr.x = numX;
		damageNode.addChild(minusSpr);
		armature.getBone("Layer3").addDisplay(damageNode, 0);

		armature.getAnimation().playWithIndex(0, -1, 0);
		armature.scale = 1.5;
		armature.anchorX = 0.0;
		armature.anchorY = 0.0;
		armature.x = target.x;
		armature.y = target.y;
		target._mapLayer._effNode.addChild(armature, UI.TOPMOST_ZORDER + 9);

		armature.getAnimation().setMovementEventCallFunc(function (armature, movementType, movementID) {
			armature.getAnimation().stop();
			armature.removeFromParent();
		});
	}
	else {
		//加血
        var woundedCount = wounded || -damage;
		target.changeTroops(damage);
		target.changeWounded(woundedCount);
		ccs.armatureDataManager.addArmatureFileInfo("res/animation/jineng_shanghai/jineng_shanghai.ExportJson");

		var armature = new ccs.Armature("jineng_shanghai");

		//damage label
		armature.getBone("Layer3").removeDisplay(0);
		var damageNode = new cc.Node();
		var originX = 37;
		var numX = originX;
		var damageCount = Math.abs(damage);
		while (damageCount !== 0) {
			var num = damageCount%10;
			var numSpr = cc.createSprite("green_" + num + ".png", {anchor:[0.5, 0.5]});
			numSpr.x = numX;
			damageNode.addChild(numSpr);
			numX -= 25;
			damageCount = (damageCount - num)/10;
		}
		var minusSpr = cc.createSprite("green_+.png", {anchor:[0.5, 0.5]});
		minusSpr.x = numX;
		damageNode.addChild(minusSpr);
		armature.getBone("Layer3").addDisplay(damageNode, 0);

		armature.getAnimation().playWithIndex(0, -1, 0);
		armature.scale = 1.5;
		armature.anchorX = 0.0;
		armature.anchorY = 0.0;
		armature.x = target.x;
		armature.y = target.y;
		target._mapLayer._effNode.addChild(armature, UI.TOPMOST_ZORDER + 9);

		armature.getAnimation().setMovementEventCallFunc(function (armature, movementType, movementID) {
			armature.getAnimation().stop();
			armature.removeFromParent();
		});
	}
};

/// 冲锋
SkillAction.charge = function(paras){
    var target = paras[0];  //技能目标
    var equiper = paras[1]; //技能装备的武将
    var equipObject = paras[2]; //使用技能的军队或建筑
    var skill = paras[3];   //技能名称
    var addParas = paras[4];    //技能附加参数对象
    var path = SkillAction.wLayer.map.tilePath(equipObject.cx, equipObject.cy, target.cx, target.cy);

    equipObject.setTarget(target, path);
    var oriRate = equipObject._speedRate;
    equipObject.setSpeedRate(999, true);
    equipObject.moveFinishCB = function(){
        //_.log('moveFinishCB');
        equipObject.setSpeedRate(oriRate, true);
    };
    equipObject.changeAIState(ArmyStateMovingUnstoppable);
    //chargeEffect
    var effectNode = new cc.Node();
    var frames = cc.getAnimFrames('skill/charge/%d.png');
    var upEffect = cc.createAni({anchor : [0.5, 0.5]}, 0, 3*cc.director.getAnimationInterval()*frames.length, frames);
    upEffect.then(function() {
    	upEffect.removeFromParent(true);
    }).act();
    upEffect.y = 15;
    //streak
    var streak = cc.ParticleSystem.create("res/images/charge.plist");
    effectNode.addChild(streak);
    effectNode.setPosition(cc.p(10.0, 35.0));
    effectNode.addChild(upEffect);
    effectNode.setTag(SYS.ChargeEffectTag*10);
    equipObject.addEffectChildUp(effectNode);
    
    var cells = SkillAction.findCellsAroundPath(path);
    SkillAction.scopeLoop(target.cx, target.cy, skill.scope, function(obj){
        if(obj.force!==equipObject.force && typeof obj.changeTroops==='function'){
            if(SkillAction.checkTargetBeDebuff(obj)) {
                var damage = SkillAction.calDamage(equiper, equipObject, obj, skill, addParas);
                //_.log('charge', damage, obj.name);
                SkillAction.attackAction(damage, equipObject, obj, ARMY_DEF.DAMAGE_TYPE_NORMAL);

                //有几率无阵
                var prob = FOMULA.wuzhen();
                var ac = _.rand(100)/100;
                if(ac<=prob){
                    SkillAction.wLayer.buffMgr.addBuff(2300401, obj);
                }
            }
        }
    }, cells);
};

/// 入梦 by 孙梦超
SkillAction.rumeng = function(paras){
    var target = paras[0];  //技能目标
    var equiper = paras[1]; //技能装备的武将
    var equipObject = paras[2]; //使用技能的军队或建筑
    var skill = paras[3];   //技能名称
    var addParas = paras[4];    //技能附加参数对象

    //_.log('兵法强度1', target.bfPower);
    SkillAction.wLayer.buffMgr.addBuff(2301510, target, skill.duration*_.TIME.SEC);
    //_.log('兵法强度2', target.bfPower);
    SkillAction.wLayer.setTimeMechine(null, skill.duration* _.TIME.SEC, 10* _.TIME.SEC, null, function(){
        var cureNum = Math.min(target.oriTroops*(0.11+skill.power*0.03), target.wounded); //使用回复参数和技能强度计算回复量, 并取该值与受伤人数中较大的一个
        var jwID = target.wuJiang.daJiang.jueWei;
        var troopsLimit = JueWei.getTroopsLimit(jwID, equipObject.force);
        if(troopsLimit - target.troops < cureNum){ //如果超出主将带兵上限，则修改为达到带兵上限
            cureNum = Math.max(troopsLimit - target.troops, 0);
        }
//        target.changeTroops(cureNum);
//        target.changeWounded(-cureNum);
        SkillAction.doDamage(target, cureNum);
    });
    _.log('aaa')
};

if (isNodeJS){
    module.exports = SkillAction;
}

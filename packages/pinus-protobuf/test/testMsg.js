var tc = module.exports;

tc.onTest = {
    'pathMap': {
        234: {'x': [{"a": 123, "b": 456, "nums": [1, 2, 3, 4]}], 'y': {"d": "d11中文", "e": "1中文23"}},
        567: {'x': [{"a": 123111}], 'y': {"d": "d13中文33"}}
    }
};

tc['area.playerHandler.enterScene'] = {
    map : {
        name : 'a',
        width : 10,
        height : 10,
        tileW : 5,
        tileH : 5,
        weightMap:[
          {'collisions':[]},
          {'collisions':[]},
          {'collisions':[
            {'start':1,'length':3},
            {'start':79,'length':3}
          ]},
          {'collisions':[
            {'start':27,'length':2},
            {'start':78,'length':4}
          ]}
        ]
    }
};

tc.onMove = {
    'entityId':14,
    'path' : [{'x':128,'y':796},{'x':677,'y':895}],
    'speed':160
};

tc.onUpgrade = {
    id:32726,
    entityId:48,
    name:'supe中文r中文1',
    kindId:210,
    kindName:'An中文gle',
    type:'pla中文yer',
    x:755,
    y:608,
    hp:352,
    mp:32,
    maxHp:352,
    maxMp:32,
    level:3,
    experience:2,
    attackValue:37,
    defenceValue:15,
    walkSpeed:240,
    attackSpeed:1.2,
    areaId:1,
    hitRate:90,
    dodgeRate:13,
    nextLevelExp:114,
    skillPoint:3
};

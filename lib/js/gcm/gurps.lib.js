(function () {
var gurps = {
    LANGUAGE_FLUENCY_COST_MAP: {
        broken: 1,
        accented: 2,
        native: 3
    },

    SKILL_DIFFICULTY_CP_COSTS: {
        easy: 1,
        average: 2,
        hard: 4,
        very_hard: 8
    },

    skill_cp_cost: function (skill) {
        var cost = this.SKILL_DIFFICULTY_CP_COSTS[skill['difficulty']];

        if (cost == undefined) {
            gcm.log('Error. Unknown skill difficulty: ' + skill['difficulty']);
            cost = -1000;
        }

        var proficiency = skill['proficiency'];
        var negative_prof = proficiency < 0;

        for (var abs_prof = Math.abs(proficiency); abs_prof > 0; abs_prof--) {
            var value = abs_prof <= 2 ? abs_prof : 4;
            cost += negative_prof ? -1 * value : value;
        }

        return cost;
    },

    basic_speed: function (attributes) {
        return (attributes['dexterity'] + attributes['health']) / 4 + attributes['basic_speed'];
    },

    basic_move: function (attributes) {
        return this.basic_speed(attributes) + attributes['basic_move'];
    },

    basic_lift: function (attributes) {
        var strength = attributes['strength'];
        return strength * strength / 5;
    },

    attributes_cp_cost: function (attributes) {
        var cp_cost = 0;

        cp_cost += (attributes['strength'] - 10) * 10;
        gcm.log('Strength CP cost: ' + (attributes['strength'] - 10) * 10);

        cp_cost += (attributes['dexterity'] - 10) * 20;
        gcm.log('Dexterity CP cost: ' + (attributes['dexterity'] - 10) * 20);

        cp_cost += (attributes['iq'] - 10) * 20;
        gcm.log('IQ CP cost: ' + (attributes['iq'] - 10) * 20);

        cp_cost += (attributes['health'] - 10) * 10;
        gcm.log('Health CP cost: ' + (attributes['health'] - 10) * 10);

        cp_cost += (attributes['hp'] - attributes['strength']) * 2;
        gcm.log('HP CP cost: ' + (attributes['hp'] - attributes['strength']) * 2);

        cp_cost += (attributes['will'] - attributes['iq']) * 5;
        gcm.log('Will CP cost: ' + (attributes['will'] - attributes['iq']) * 5);

        cp_cost += (attributes['perception'] - attributes['iq']) * 5;
        gcm.log('Preception CP cost: ' + (attributes['perception'] - attributes['iq']) * 5);

        cp_cost += (attributes['fp'] - attributes['health']) * 3;
        gcm.log('FP CP cost: ' + (attributes['fp'] - attributes['health']) * 3);

        cp_cost += attributes['basic_speed'] * 20;
        gcm.log('Basic Speed CP cost: ' + attributes['basic_speed'] * 20);

        cp_cost += attributes['basic_move'] * 5;
        gcm.log('Basic Move CP cost: ' + attributes['basic_move'] * 5);

        return cp_cost;
    },

    physical_features_cp_cost: function (physical_features) {
        var reaction_modifiers = physical_features['reaction_modifiers'];
        var cp_cost = 0;

        for (var i in reaction_modifiers) {
            cp_cost += reaction_modifiers[i]['cp_cost'];
        }

        return cp_cost;
    },

    language_cost: function (language) {
        var fluency_modifier = this.LANGUAGE_FLUENCY_COST_MAP[language['fluency']];
        var cost = 0;

        if (language['spoken']) {
            cost += fluency_modifier;
        }

        if (language['written']) {
            cost += fluency_modifier;
        }

        return cost;
    },

    culture_features_cp_cost: function (culture_features) {
        var languages = culture_features['languages'];

        // First language and culture are free
        var cp_cost = -7;
        cp_cost += culture_features['familiarities'].length;

        for (var i in languages) {
            cp_cost += this.language_cost(languages[i]);
        }

        return cp_cost;
    },

    advantages_cp_cost: function (advantages) {
        var cp_cost = 0;

        for (var i in advantages) {
            cp_cost += advantages[i]['cp_cost'];
        }

        return cp_cost;
    },

    skills_cp_cost: function (skills) {
        var cp_cost = 0;

        for (var i in skills) {
            var skill = skills[i];

            if (!skill['disabled']) {
                var cost = this.skill_cp_cost(skills[i]);

                gcm.log('Skill: ' + skill['name'] + ' - Cost: ' + cost);
                cp_cost += cost;
            }
        }

        return cp_cost;
    },

    disadvantages_cp_return: function (disadvantages) {
        var cp_return = 0;

        for (var i in disadvantages) {
            var disadvantage = disadvantages[i];

            if (!disadvantage['disabled']) {
                cp_return += disadvantages[i]['cp_return'];
            }
        }

        return cp_return;
    }
};

gcm.gurps = gurps;
})();

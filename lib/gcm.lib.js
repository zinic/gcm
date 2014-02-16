function gcm_log(msg) {
    if (console != null) {
        console.log(msg);
    } else {
        alert(msg);
    }
}

function gcm_format_unit(unit) {
    var value_html = '' + unit.value;

    if (unit.shorthand != null && unit.shorthand.length > 0) {
        value_html += '<span class="unit_shorthand">' + unit.shorthand + '</span>';
    }

    return value_html;
}

function gcm_process_template(template, value_dict, prefix) {
    var processed_template = template;

    for (var key in value_dict) {
        var prefixed_key =  (prefix != null && prefix.length > 0)  ? prefix + '.' + key : key;

        var value = value_dict[key];
        var value_type = typeof(value);

        if (value_type === 'string' || value_type === 'number' || value_type === 'boolean') {
            var regexp = new RegExp('\\${' + prefixed_key + '}');
            processed_template = processed_template.replace(regexp, value);
        } else if (value_type === 'object') {
            processed_template = gcm_process_template(processed_template, value, prefixed_key);
        }
    }

    return processed_template;
}

SKILL_DIFFICULTY_CP_COSTS = {
    'easy': 1,
    'average': 1,
    'hard': 1,
    'very_hard': 1
};2

function gcm_skill_cp_cost(skill) {
    var cost = SKILL_DIFFICULTY_CP_COSTS[skill['difficulty']];

    if (cost == undefined) {
        gcm_log('Error. Unknown skill difficulty: ' + skill['difficulty']);
        cost = -1000;
    }

    var proficiency = skill['proficiency'];
    var negative_prof = proficiency < 0;

    for (var abs_prof = Math.abs(proficiency); abs_prof > 0; abs_prof--) {
        var value = abs_prof <= 2 ? abs_prof : 4;
        cost += negative_prof ? -1 * value : value;
    }

    return cost;
}

function gcm_init() {
    gcm_load_character('./lib/example_character.json');
}

function gcm_load_character(location) {
    $.get(location, gcm_display_character);
}

function gcm_display_character(character) {
    gcm_update_character_identity(character);
    gcm_update_character_physical_features(character['physical_features']);
    gcm_update_character_attributes(character['attributes']);
    gcm_update_character_culture_features(character['culture_features']);
    gcm_update_character_advantages(character['advantages']);
    gcm_update_character_skills(character['skills']);
    gcm_update_character_disadvantages(character['disadvantages']);
}

function gcm_update_character_identity(character) {
    $('#character_name_value').html(character['name']);
    $('#player_name_value').html(character['player']);
    $('#character_tech_level_value').html(character['tech_level']);
}

function gcm_update_character_physical_features(physical_features) {
    for (var feature_key in physical_features) {
        var target_element = '#character_' + feature_key + '_value';
        $(target_element).html(gcm_format_unit(physical_features[feature_key]));
    }
}

function gcm_update_character_attributes(attributes) {
    for (var attr_key in attributes) {
        var target_element = '#' + attr_key + '_value';
        $(target_element).html(attributes[attr_key]);
    }
}

function gcm_update_character_culture_features(culture_features) {
    gcm_update_character_languages(culture_features['languages']);
    gcm_update_character_cluture_familiarities(culture_features['familiarities']);
}

function gcm_update_character_languages(languages) {
    $.get('./templates/language_table.template.html', function (template) {
        var html = '';

        for (var i in languages) {
            html += gcm_process_template(template, languages[i]);
        }

        $('#language_tables_pane').html(html);
    });
}

function gcm_update_character_cluture_familiarities(cluture_familiarities) {
    $.get('./templates/culture_familiarity_table.template.html', function (template) {
        var html = '';

        for (var i in cluture_familiarities) {
            html += gcm_process_template(template, cluture_familiarities[i]);
        }

        $('#cluture_familiaritiy_tables_pane').html(html);
    });
}

function gcm_update_character_advantages(advantages) {
    $.get('./templates/advantage_table.template.html', function (template) {
        var html = '';

        for (var i in advantages) {
            html += gcm_process_template(template, advantages[i]);
        }

        $('#advantage_tables_pane').html(html);
    });
}

function gcm_update_character_advantages(advantages) {
    $.get('./templates/advantage_table.template.html', function (template) {
        var html = '';

        for (var i in advantages) {
            html += gcm_process_template(template, advantages[i]);
        }

        $('#advantage_tables_pane').html(html);
    });
}

function gcm_update_character_skills(skills) {
    $.get('./templates/skill_table.template.html', function (template) {
        var html = '';

        for (var i in skills) {
            var skill = skills[i];
            skill['cp_cost'] = gcm_skill_cp_cost(skill);

            html += gcm_process_template(template, skill);
        }

        $('#skill_tables_pane').html(html);
    });
}

function gcm_update_character_disadvantages(disadvantage) {
    $.get('./templates/disadvantage_table.template.html', function (template) {
        var html = '';

        for (var i in disadvantage) {
            html += gcm_process_template(template, disadvantage[i]);
        }

        $('#disadvantage_tables_pane').html(html);
    });
}

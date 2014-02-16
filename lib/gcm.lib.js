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
    gcm_update_culture_features(character['culture_features']);
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

function gcm_update_culture_features(culture_features) {
    gcm_update_character_languages(culture_features['languages']);
}

function gcm_update_character_languages(languages) {
    $.get('./templates/language_table.template.html', function (template) {
        var html = '';

        for (var i in languages) {
            var template_copy = template;
            var language = languages[i];

            template_copy = template_copy.replace(/\${name}/, language['name']);
            template_copy = template_copy.replace(/\${fluency}/, language['fluency']);
            template_copy = template_copy.replace(/\${spoken}/, language['spoken']);
            template_copy = template_copy.replace(/\${written}/, language['written']);

            html += template_copy;
        }

        $('#language_tables_pane').html(html);
    });
}

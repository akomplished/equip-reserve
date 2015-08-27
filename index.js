﻿(function () {
    var authorizedUser = ['jgoebel@mrpk.org', 'mdavis@mrpk.org'];
    var driveEquipment, fileInfo = {};    
    var creds = {
        apiKey: 'AIzaSyAh9LEWUk9ap7-a3PMWEKc-fa2o2GYWSqo',
        clientId: '575160396391-877cnqiks55u2is62qnbkn5egiiedqlc.apps.googleusercontent.com',
        scopes: ['https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/drive.appdata',
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/drive.scripts',
            'https://www.googleapis.com/auth/script.external_request',
            'https://www.googleapis.com/auth/script.send_mail',
            'https://www.googleapis.com/auth/script.storage',
            'https://www.googleapis.com/auth/spreadsheets'],
        domain: 'mrpkedu.org'
    };

    window.onJSClientLoad = function () {
        gapi.client.setApiKey(creds.apiKey);
        gapi.auth.init(function () {
            window.setTimeout(checkAuth, 1);
        });
    };

    var checkAuth = function () {
        gapi.auth.authorize({
            client_id: creds.clientId,
            scope: creds.scopes,
            immediate: true,
            hd: creds.domain
        }, handleAuthResult);
    };

    function handleAuthResult(authResult) {
        if (authResult && !authResult.error) {
            console.log("initial auth successful");
            gapi.client.load('oauth2', 'v2', function () {
                gapi.client.oauth2.userinfo.get().execute(function (resp) {
                    for (var r in resp.result) {
                        googleUser[r] = resp.result[r];
                    }
                    googleUser['username'] = googleUser['email'].substring(0, googleUser['email'].indexOf('@'));
                    googleUser['email'] = googleUser['email'].substring(0, googleUser['email'].indexOf('@')) + '@mrpk.org';
                    google.load('visualization', '1', { "callback": onVisualAPILoad });
                });
            });
        } else {
            $('#authorizebutton').show(400, function (e) {
                handleAuthClick(e);
            });
        }
    }

    var onVisualAPILoad = function () {
        var sheetName = '&sheet=StaffRoster';
        var userQueryString = encodeURIComponent('select A, B, C, D where A = "' + googleUser['username'] + '"');
        var userQuery = new google.visualization.Query('https://docs.google.com/a/mrpkedu.org/spreadsheets/d/18hPXh8SC_cStvZQ8gJtBsUwKz6iP26Qu1HvD7oWNZqg/gviz/tq?sheet=StaffRoster&tq=' + userQueryString);

        var reserveSheet = '&sheet=Reservations';
        var reserveQueryString = encodeURIComponent('select D, E, F, G, H, J where D = "' + googleUser['email'] + '"');
        var reserveQuery = new google.visualization.Query('https://docs.google.com/a/mrpkedu.org/spreadsheets/d/18hPXh8SC_cStvZQ8gJtBsUwKz6iP26Qu1HvD7oWNZqg/gviz/tq?sheet=Reservations&tq=' + reserveQueryString);

        console.log(userQueryString);
        userQuery.send(handleUserQuery);

        console.log(reserveQueryString);
        reserveQuery.send(handleReserveQuery);
    };

    function handleAuthClick(event) {
        gapi.auth.authorize({
            client_id: creds.clientId,
            scope: creds.scopes,
            hd: creds.domain,
            immediate: false
        }, handleAuthResult);
        return false;
    }

    var onDriveAPILoad = function () {
        var id = '0B33ZOPU9STy0dW9IekFVTElDUXc';
        var request = gapi.client.drive.files.get({
            'fileId': id
        });

        request.execute(function (resp) {
            fileInfo = resp;
            downloadDriveFile(resp);
        });
    };

    function downloadDriveFile(file) {
        var accessToken = gapi.auth.getToken().access_token;
        var xhr = new XMLHttpRequest();
        xhr.open('GET', file.downloadUrl);
        xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
        xhr.onload = function () {
            handleDriveResult(xhr.responseText);
        }
        xhr.onerror = function () {
            console.log("error");
        };
        xhr.send();
    }

    var handleDriveResult = function (response) {
        driveEquipment = $.parseJSON(response);
        $('#dynamic-types').empty();
        var cartCount = 1;
        for (var d in driveEquipment) {
            $('#dynamic-types').prepend('<span><input type="radio" data-cartcount="' + driveEquipment[d].cartcount + '" data-increment="' + driveEquipment[d].inc + '" data-maximum="' + driveEquipment[d].max + '" id="eq-cb-type_' + d + '" value="' + d + '" name="eq-checkbox" onchange="setClassValid(this)" required> <label for="eq-cb-type_' + d + '" class="ss-choice-label">' + d + '</label></span>');
            cartCount += 1;
        }
        $('#container').hide();
    }

    var handleUserQuery = function (response) {
        var result = $.parseJSON(response.getDataTable().toJSON());
        if (result.rows.length > 0) {
            updateDisplay();
            for (var authUser in authorizedUser) {
                if (googleUser.email == authorizedUser[authUser]) {
                    $('.ss-header-image-image').append('<map name="authuser"><area shape="default" coords="0,0,200,200" /></map>');
                    $('#main-banner').attr('usemap', '#authuser');
                    $("map[name=authuser] area").on('click', driveJsonLoader);
                }
            }
        } else {
            addNewUser();
        }
    };

    var driveJsonLoader = function () {
        var divcontainer = document.createElement('div');
        $(divcontainer).addClass('inputuserinfo');

        var display = '<form id="equip-form" onsubmit="event.preventDefault(); handleFormSubmit($(this));">';
        display += '<div style="width: 100%; display: block;"><center><table id="tblType" class="highlighter" style="width: 90%; text-align: center; font-size: 13px;"><thead><tr><th>Equipment Type</th><th># Per Cart</th><th>Total Units</th><th>Total  Carts</th><th>Remove</th></tr></thead><tbody>';
        for (var e in driveEquipment) {
            display += '<tr><td>' + e + '</td><td>' + driveEquipment[e].inc + '</td><td>' + driveEquipment[e].max + '</td><td>' + driveEquipment[e].cartcount + '</td><td><input type="image" src="images/trash-delete.gif" onclick="removeRow(this);"></tr>';
        }
        display += '</tbody></table><center></div>';

        display += '<fieldset class="ui-corner-all ui-draggable" style="margin-bottom: 5px; margin-top: 10px"><legend>New Equipment Entry</legend>';
        display += '<span style="display: block; margin-top: 3px; margin-bottom: 3px;">';
        display += '<label for="first" class="ss-choice-label">Type: </label><input type="text" id="type" name="type" required size="15">&nbsp&nbsp';
        display += '<label for="inc" class="ss-choice-label">Number of Carts: </label><input type="text" id="cartcount" name="cartcount" required size="5" pattern="[0-9]+">&nbsp&nbsp';
        display += '<label for="max" class="ss-choice-label">Total: </label><input type="text" id="max" name="maximum" required size="5" pattern="[0-9]+">&nbsp&nbsp';
        display += '<input class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" style="float: right; position: relative;" type="submit" id="equip-form-submit" value="Add" form="equip-form"></span>';
        display += '</fieldset>';
        display += "</form>";

        $(".inputuserinfo").html(display);
        $(".inputuserinfo").dialog({
            autoOpen: true,
            title: 'Add Equipment Type',
            resizable: false,
            modal: false,
            width: 575,
            maxheight: 750,
            buttons: {
                Submit: {
                    id: "prompt-btn",
                    text: "Save",
                    click: function (event) {
                        var objs = {};
                        $('#tblType tbody tr').each(function () {
                            var obj = {};
                            var key = this.children[0].innerHTML;

                            obj[key] = key;
                            obj[key] = {
                                inc: this.children[1].innerHTML,
                                max: this.children[2].innerHTML,
                                cartcount: this.children[3].innerHTML
                            };
                            return $.extend(objs, obj);
                        });
                        console.log(objs);
                        globalparam.unsavedChangesExist = false;
                        updateJsonFile(JSON.stringify(objs), downloadDriveFile);
                        $('.inputuserinfo').dialog("close");
                    }
                },
                Cancel: {
                    text: "Cancel",
                    click: function () {
                        if (globalparam.unsavedChangesExist === true) {
                            if (!window.confirm('You have unsaved changes. Would you like to discard any unsaved changes?'))
                                return event.preventDefault()
                        }
                        else {
                            return $('.inputuserinfo').dialog("close");
                        }
                    }
                }
            },
            close: function (event, ui) {
                $("#blocker").hide();
            },
            open: function (event, ui) {
                $("#blocker").show();
                $(".ui-dialog-buttonpane button:contains('Save')").button('disable');
            },
            beforeClose: function (event, ui) {
                if (globalparam.unsavedChangesExist === true) {
                    if (!window.confirm('You have unsaved changes. Would you like to discard any unsaved changes?'))
                        return event.preventDefault();
                    return;
                }
            }
        });
    };

    function addNewUser() {
        var user = {
            UserName: googleUser['username'],
            FirstName: googleUser['given_name'],
            LastName: googleUser['family_name'],
            Email: googleUser['email'],
            func: "addUser"
        };
        var payload = $.param(user);
        $.ajax({
            url: 'https://script.google.com/a/macros/mrpkedu.org/s/AKfycbySJ9Yp0_rY4320wMvg_9fQJUEDyOVztpdcCYa4jEVh/exec',
            crossDomain: true,
            jsonp: 'callback',
            dataType: 'jsonp',
            data: payload,
            success: function (data) {
                if (data.result == "success") {
                    return updateDisplay();
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                return alert('The following error occured while adding user access: ' + errorThrown);
            }
        });
    }

    function updateDisplay() {
        $('div#user-details').empty();
        $('div#user-details').css('display', 'block');

        var usertable = "<table><tr>";
        usertable += '<tr><td style="font-size: 16px;">Hello <strong>' + googleUser['given_name'] + ' ' + googleUser['family_name'] + '</strong>,</td></tr>';
        usertable += '<tr><td style="padding-left: 15px;"><p>Welcome to the Moorpark High School Equipment Reservation Form.</p></td></tr>';
        usertable += '<tr><td style="padding-left: 15px;">This website will allow you to quickly check the availability and place reservations for student equipment from nearly any Internet connected tablet, smartphone or computer.</td></tr>';
        usertable += "</tr></table>";
        usertable += "<input type=\"hidden\" name=\"email-entry\" value=\"" + googleUser['email'] + "\"/>";
        usertable += "<input type=\"hidden\" name=\"firstname-entry\" value=\"" + googleUser['given_name'] + "\"/>";
        usertable += "<input type=\"hidden\" name=\"lastname-entry\" value=\"" + googleUser['family_name'] + "\"/>";
        $('div#user-details').html(usertable);
        gapi.client.load('drive', 'v2', onDriveAPILoad);
    }

    function updateJsonFile(fileData, callback) {
        var boundary, delimiter, close_delim;
        boundary = "-------314159265358979323846";
        delimiter = "\r\n--" + boundary + "\r\n";
        close_delim = "\r\n--" + boundary + "--";
        var accessToken = gapi.auth.getToken().access_token;

        var metadata = { 'mimeType': fileInfo.mimeType };

        var multipartRequestBody =
             delimiter + 'Content-Type: application/json\r\n\r\n' +
             JSON.stringify(metadata) +
             delimiter + 'Content-Type: ' + fileInfo.mimeType + '\r\n' + '\r\n' +
             fileData +
             close_delim;

        var request = gapi.client.request({
            'path': '/upload/drive/v2/files/' + fileInfo.id,
            'method': 'PUT',
            'params': { 'uploadType': 'multipart', 'alt': 'json' },
            'headers': {
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
            },
            'body': multipartRequestBody
        });
        request.execute(callback);
    }
})();



const showText = localStorage.getItem("showText");

if (showText === "true") {
    $('#showText').attr('checked', true);
    $('#textarea-container').removeClass('d-none');
} else {
    $('#showText').attr('checked', false);
    $('#textarea-container').addClass('d-none');
}

$('#showText').on('change', function () {
    if ($(this).is(':checked')) {
        localStorage.setItem("showText", "true");
        $('#textarea-container').removeClass('d-none');
    } else {
        localStorage.setItem("showText", "false");
        $('#textarea-container').addClass('d-none');
    }
});

// -------------------------------------------------------------


const jsonNew = {
    "people.one": "accountant",
    "people.two": "actor",
    "people.three": "artist manga",
    "people.four": "astronaut",
    "people.five": "astronomer",
    "people.six": "entrepreneur",
}

const jsonOld = {
    "people.one": "accountant",
    "people.two": "actor",
    "people.three": "artist",
    "people.seven": "doctor",
}

const jsonTranslated = {
    "people.one": "kế toán viên",
    "people.two": "diễn viên",
    "people.three": "nghệ sĩ",
    "people.seven": "doctor",
}


// Tìm các giá trị mới chỉ có trong jsonNew
function findNewValues(jsonNew, jsonOld) {
    const newEntriesObj = _.reduce(jsonNew, (result, value, key) => {
        if (_.isUndefined(jsonOld[key])) {
            result[key] = value;
        }
        return result;
    }, {});

    console.log('Các giá trị mới:', newEntriesObj);
    return newEntriesObj;
}

// Tìm các cặp giá trị đã thay đổi giữa jsonNew và jsonOld
function findChangedValues(jsonNew, jsonOld) {
    const changedEntriesObj = _.reduce(jsonNew, (result, value, key) => {
        if (!_.isUndefined(jsonOld[key]) && !_.isEqual(value, jsonOld[key])) {
            result[key] = value;
        }
        return result;
    }, {});

    console.log('Các cặp giá trị đã thay đổi:', changedEntriesObj);
    return changedEntriesObj;
}

// Tìm các khóa đã cũ và không có trong jsonNew
function findRemovedKeys(jsonNew, jsonOld) {
    const oldKeys = _.keys(jsonOld);
    const newKeys = _.keys(jsonNew);

    const removedKeys = _.difference(oldKeys, newKeys);

    console.log('Các khóa đã cũ và không có trong jsonNew:', removedKeys);
    return removedKeys;
}

// Sắp xếp lại đối tượng
function sortJsonByNewOrder(jsonNew, jsonOld) {
    const sortedJsonOld = {};

    // Duyệt qua các khóa của jsonNew để lấy thứ tự
    _.forEach(jsonNew, (value, key) => {
        if (jsonOld.hasOwnProperty(key)) {
            sortedJsonOld[key] = jsonOld[key];
        }
    });

    return sortedJsonOld;
}


$('#btn-update').click(async function () {
    const newValues = findNewValues(jsonNew, jsonOld);
    const changedValues = findChangedValues(jsonNew, jsonOld);
    const removedKeys = findRemovedKeys(jsonNew, jsonOld);

    // Xoá các cặp giá trị cũ
    _.forEach(removedKeys, key => {
        delete jsonOld[key];
        delete jsonTranslated[key];
    });

    // Tách newValues thành các mảng để dịch
    const newValuesObj = exportObj(newValues);
    const textGroups = splitTexts(newValuesObj.values.map(convertSymbol), 1000); // Tách văn bản thành các nhóm
    const translatedValues = [];

    // Lặp và dịch này mảng văn bản
    for (const group of textGroups) {
        const groupText = group.join('\n'); // Gộp mảng thành văn bản
        const text = await translation(groupText, 'en', 'vi', API[0]);
        translatedValues.push(...text.translateText.split('\n').map(recoverySymbol));
    }
    const translatedObj = importObj(newValuesObj.paths, translatedValues); // Tạo obj mới với values đã dịch

    // Tách changedValues thành các mảng để dịch
    const changedValuesObj = exportObj(changedValues);
    const textGroupsChanged = splitTexts(changedValuesObj.values.map(convertSymbol), 1000); // Tách văn bản của mảng thay đổi
    const changedTranslatedValues = [];

    // Lặp và dịch này mảng văn bản
    for (const group of textGroupsChanged) {
        const groupText = group.join('\n'); // Gộp mảng thành văn bản
        const text = await translation(groupText, 'en', 'vi', API[0]);
        changedTranslatedValues.push(...text.translateText.split('\n').map(recoverySymbol));
    }
    const changedTranslatedObj = importObj(changedValuesObj.paths, changedTranslatedValues); // Tạo obj mới với values đã dịch

    // Thay thế dữ liệu mới từ changedValues cho jsonOld
    _.forEach(changedValues, (value, key) => {
        jsonOld[key] = value;
    });

    // Thay thế dữ liệu mới từ changedTranslatedObj cho jsonTranslated
    _.forEach(changedTranslatedObj, (value, key) => {
        jsonTranslated[key] = value;
    });

    // Thêm các giá trị mới từ newValues vào jsonOld
    _.forEach(newValues, (value, key) => {
        jsonOld[key] = value;
    });

    // Thêm các giá trị đã dịch từ translatedObj vào jsonTranslated
    _.forEach(translatedObj, (value, key) => {
        jsonTranslated[key] = value;
    });

    const sortedObjTranslated = sortJsonByNewOrder(jsonNew, jsonTranslated);
    $('#updateResult').val(JSON.stringify(sortedObjTranslated, null, 2));

    // Tạo biến dataTable
    const dataTable = _.map(jsonNew, (value, key) => ({
        key: key,
        value: value,
        translated: sortedObjTranslated[key]
    }));

    // Tạo bảng và gán dữ liệu cho bảng
    $('#tb_updateBody').html(createTable('#tb_update-Template', dataTable));

    $('#btn-update_copy').css('visibility', 'unset'); // Hiển thị nút sao chép
});

// Nút sao chép kết quả
$('#btn-update_copy').click(function () {
    var textarea = $('#updateResult');

    navigator.clipboard.writeText(textarea.val()).then(function () {
        // Thông báo cho người dùng (tùy chọn)
        showSuccessToast('Đã sao chép nội dung!');
    }).catch(function (err) {
        console.error('Không thể sao chép nội dung: ', err);
        showErrorToast('Có lỗi khi sao chép nội dung!');
    });
});
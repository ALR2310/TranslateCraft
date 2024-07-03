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

$('#update-openFiles').on('change', function (e) {
    const files = e.target.files;

    if (files.length > 0) {
        const handleFile = (file, index) => {
            const reader = new FileReader(); 
            reader.onload = function (res) {
                if (index === 0)
                    $('#textJsonNew').val(res.target.result);
                else if (index === 1)
                    $('#textJsonOld').val(res.target.result);
                else
                    $('#textJsonTranslated').val(res.target.result);
            };

            reader.readAsText(file); 
        };

        Array.from(files).forEach((file, index) => {
            handleFile(file, index);
        });
    }
});


// -------------------------------------------------------------

// Tìm các giá trị mới chỉ có trong jsonNew
function findNewValues(objNew, objOld) {
    const newEntries = _.reduce(objNew, (result, value, key) => {
        if (_.isUndefined(objOld[key])) {
            result[key] = value;
        }
        return result;
    }, {});

    return newEntries;
}

// Tìm các cặp giá trị đã thay đổi giữa jsonNew và jsonOld
function findChangedValues(objNew, objOld) {
    const changedEntries = _.reduce(objNew, (result, value, key) => {
        if (!_.isUndefined(objOld[key]) && !_.isEqual(value, objOld[key])) {
            result[key] = value;
        }
        return result;
    }, {});

    return changedEntries;
}

// Tìm các khóa đã cũ và không có trong jsonNew
function findRemovedKeys(objNew, objOld) {
    const oldKeys = _.keys(objOld), newKeys = _.keys(objNew);
    const removedKeys = _.difference(oldKeys, newKeys);
    return removedKeys;
}

// Hàm xoá giá trị cũ
function removeOldValues(keys, objOld, translatedObj) {
    _.forEach(keys, key => {
        delete objOld[key];
        delete translatedObj[key];
    });
}

// Hàm cập nhật đối tượng
function updateObject(targetObj, changedValues, newValues) {
    _.forEach(changedValues, (value, key) => {
        targetObj[key] = value;
    });

    _.forEach(newValues, (value, key) => {
        targetObj[key] = value;
    });
}

$('#btn-update').click(async function () {
    try {
        startProgressBar('#progressUpdate', 500); // Bắt đầu thanh tiến trình, cập nhật mỗi 0.5s
        const jsonNew = JSON.parse($('#textJsonNew').val());
        const jsonOld = JSON.parse($('#textJsonOld').val());
        const jsonTranslated = JSON.parse($('#textJsonTranslated').val());

        const newValues = findNewValues(jsonNew, jsonOld);
        const changedValues = findChangedValues(jsonNew, jsonOld);
        const removedKeys = findRemovedKeys(jsonNew, jsonOld);

        // Xoá các cặp giá trị cũ
        removeOldValues(removedKeys, jsonOld, jsonTranslated);

        // Dịch và nhập lại thành một obj
        const objTranslated = await translateObj(newValues, Number($('#textLimit_update').val()), API[$('#api_update').val()]);
        const changedTranslated = await translateObj(changedValues, Number($('#textLimit_update').val()), API[$('#api_update').val()]);

        // Thay thế và thêm dữ liệu
        updateObject(jsonOld, changedValues, newValues);
        updateObject(jsonTranslated, changedTranslated, objTranslated);

        // Sắp xếp lại dữ liệu theo obj gốc và in ra giao diện
        const sortedObjTranslated = sortedObj(jsonNew, jsonTranslated);
        $('#updateResult').val(JSON.stringify(sortedObjTranslated, null, Number($('#spaceRow_update').val())));

        // Tạo bảng và gán dữ liệu cho bảng
        const dataTable = createDataTable(jsonNew, sortedObjTranslated);
        $('#tb_updateBody').html(createTable('#tb_update-Template', dataTable));

        // Tự động điều chỉnh chiều cao của tất cả các textarea
        $('#tb_updateBody').find('textarea').each(function () {
            autoResizeTextarea(this);
        });

        $('#btn-update_copy').css('visibility', 'unset'); // Hiển thị nút sao chép
        stopProgressBar('#progressUpdate', 700); // Kết thúc thanh tiến trình, đóng sau 0.7s
    } catch (error) {
        console.log(error);
        stopProgressBar('#progressUpdate', 0);
        showErrorToast("Có lỗi xảy ra trong quá trình dịch");
    }
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
// Cài đặt trên trang
const updatePage = JSON.parse(localStorage.getItem("pages")).update;
$('#showTextInput_update').prop('checked', updatePage.showTextInput);
$('#showTextOutput_update').prop("checked", updatePage.showTextOutput);

$('#showTextInput_update, #showTextOutput_update').on('change', function () { toggleInOutTextU(); });

function toggleInOutTextU() {
    const showTextInput = $('#showTextInput_update').is(':checked');
    const showTextOutput = $('#showTextOutput_update').is(':checked');

    if (showTextInput) $('#textarea-container').removeClass('d-none');
    else $('#textarea-container').addClass('d-none');

    if (showTextOutput) {
        $('#col-text_update').removeClass('d-none');
        $('#col-table_update').addClass('col-7');
    } else {
        $('#col-text_update').addClass('d-none');
        $('#col-table_update').removeClass('col-7');
    }
}

// Đọc dữ liệu trong tệp
$('#update-openFiles').on('change', function (e) {
    const files = e.target.files;

    if (files.length > 0) {
        const handleFile = (file, index) => {
            const reader = new FileReader();
            reader.onload = function (res) {
                if (index === 0) {
                    $('#textJsonNew').val(res.target.result);
                } else if (index === 1) {
                    $('#textJsonOld').val(res.target.result);
                } else {
                    $('#textJsonTranslated').val(res.target.result);
                }
                checkIsObj('#textJsonNew, textJsonOld, #textJsonTranslated');
                filterTableUpdate();
            };

            reader.readAsText(file);
        };

        Array.from(files).forEach((file, index) => {
            handleFile(file, index);
        });
    }
});

$("#textJsonNew, #textJsonTranslated, #textJsonOld").on("input", function () {
    if ($(this).val() === "") return;
    checkIsObj(this);
    filterTableUpdate();
});


/* ---------------- Các hàm và sự kiên liên quan đến lọc và đánh dấu trên bảng -------------- */

function filterTableUpdate() {
    try {
        const jsonNew = JSON.parse($('#textJsonNew').val());
        const jsonOld = JSON.parse($('#textJsonOld').val());
        const jsonTranslated = JSON.parse($('#textJsonTranslated').val());

        // Tìm các giá trị có sự thay đổi
        const objNewValues = findNewValues(jsonNew, jsonOld);
        const objChangedValues = findChangedValues(jsonNew, jsonOld);
        const objOldKeys = findOldKeys(jsonNew, jsonOld);

        // Xoá các cặp giá trị cũ
        removeOldValues(objOldKeys, jsonOld, jsonTranslated);

        // Sắp xếp lại obj
        const sorted = sortedObj(jsonNew, { ...objNewValues, ...objChangedValues });

        console.log(sorted);
        // console.log(objChangedValues)

        // Tạo bảng lọc giá trị
        createTableFilter(sorted, '#tb_filterUpdate', '#tb_filterUpdate-Template')
    } catch (e) {
        console.log(e);
    }
}

// Gắn sự kiện cho các thẻ
$('#filterContent_update').on('input', function () {
    highlighTableFilter($(this).val(), '#tb_filterUpdate', '#filterType_update')
});
$('#filterType_update').on('change', function () {
    highlighTableFilter($('#filterContent_update').val(), '#tb_filterUpdate', '#filterType_update')
});

// --------------------- Các hàm liên quan đến cập nhật json ----------------------------

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
function findOldKeys(objNew, objOld) {
    const oldKeys = _.keys(objOld), newKeys = _.keys(objNew);
    return _.difference(oldKeys, newKeys);
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

        // Lấy ra các giá trị có sự thay đổi
        const objNewValues = findNewValues(jsonNew, jsonOld);
        const objChangedValues = findChangedValues(jsonNew, jsonOld);
        const objOldKeys = findOldKeys(jsonNew, jsonOld);

        // Xoá các cặp giá trị cũ hoặc đã thay đổi
        removeOldValues(objOldKeys, jsonOld, jsonTranslated);
        removeOldValues(objChangedValues, jsonOld, jsonTranslated);

        // Gọp lại thành một obj với các nội dung cần dịch
        const objToTranslate = { ...objNewValues, ...objChangedValues };

        // Dịch obj
        const objTranslated = await translateObj(objToTranslate, 'auto', 'vi', API[$('#api').val()], Number($('#textLimit').val()));

        // Kết hợp dữ liệu mới vào jsonTranslated
        const combiedObjTranslated = { ...jsonTranslated, ...objTranslated };

        // Sắp xếp lại dữ liệu theo obj gốc và in ra giao diện
        const sorted = sortedObj(jsonNew, combiedObjTranslated); 
        $('#updateResult').val(JSON.stringify(sorted, null, Number($('#spaceRow').val())));

        // Tạo bảng và gán dữ liệu cho bảng
        const dataTable = createDataTable(jsonNew, sorted);
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
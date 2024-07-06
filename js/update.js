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
        resizeRowTable('#tb_update', 3, "200px", "auto", "275px");
    } else {
        $('#col-text_update').addClass('d-none');
        $('#col-table_update').removeClass('col-7');
        resizeRowTable('#tb_update', 3, "300px", "auto", "500px");
    }
}

// Đọc dữ liệu trong tệp
$('#update-openFiles').on('change', function (e) {
    const files = e.target.files;

    if (files.length > 0) {
        const fileReaders = [];

        const handleFile = (file, index) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = function (res) {
                    resolve({ index: index, content: res.target.result });
                };
                reader.onerror = reject;
                reader.readAsText(file);
            });
        };

        // Tạo một mảng promise để chờ tất cả các file được đọc xong
        Array.from(files).forEach((file, index) => {
            fileReaders.push(handleFile(file, index));
        });

        // Khi tất cả các promise được hoàn thành
        Promise.all(fileReaders).then(results => {
            results.forEach(file => {
                if (file.index === 0) {
                    $('#textJsonOld').val(file.content);
                } else if (file.index === 1) {
                    $('#textJsonNew').val(file.content);
                } else if (file.index === 2) {
                    $('#textJsonTranslated').val(file.content);
                }
            });
            checkIsObj('#textJsonNew, #textJsonOld, #textJsonTranslated');
            filterTableUpdate();
        }).catch(error => {
            console.error("Error reading files:", error);
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

        // Tạo bảng với các thay đổi
        changesTableUpdate(objNewValues, objChangedValues, objOldKeys)

        // Xoá các cặp giá trị cũ
        removeOldValues(objOldKeys, jsonOld, jsonTranslated);

        // Sắp xếp lại obj
        const sorted = sortedObj(jsonNew, { ...objNewValues, ...objChangedValues });

        // Tạo bảng lọc giá trị
        createTableFilter(sorted, '#tb_filterUpdate', '#tb_filterUpdate-Template');
    } catch (e) {
        console.log(e);
    }
}

function changesTableUpdate(objNewValues, objChangedValues, objOldKeys) {
    const combiedObj = { ...objNewValues, ...objChangedValues, ...objOldKeys}

    // Tạo bảng các thay đổi
    createTableFilter(combiedObj, "#tb_changesUpdate", "#tb_changesUpdate-Template");

    // Lọc qua bảng tb_changesUpdate và thêm class vào các thẻ <tr>
    $('#tb_changesUpdate tbody tr').each(function () {
        const key = $(this).find('.key-column').text().trim();

        if (objNewValues.hasOwnProperty(key)) {
            $(this).addClass('table-success');
        } else if (objChangedValues.hasOwnProperty(key)) {
            $(this).addClass('table-info');
        } else if (objOldKeys.hasOwnProperty(key)) {
            $(this).addClass('table-danger');
        }
    });
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

$('#btn-update').click(async function () {
    try {
        $(this).addClass("disabled");
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
        var objToTranslate = { ...objNewValues, ...objChangedValues };

        // Lọc đối tượng và xác định tùy chọn
        const [filteredObj, remainingObj] = filterObj(objToTranslate, $('#filterContent_update').val());
        const options = $('#filterType_update').is(':checked') ?
            { filteredObj: remainingObj, remainingObj: filteredObj } :
            { filteredObj: filteredObj, remainingObj: remainingObj };
        objText = $('#filterType_update').is(':checked') ? remainingObj : filteredObj;

        // Dịch obj
        const objTranslated = await translateObj(objToTranslate, 'auto', 'vi', API[$('#api').val()], Number($('#textLimit').val()));

        // Kết hợp dữ liệu mới vào jsonTranslated
        const combiedObjTranslated = { ...jsonTranslated, ...objTranslated, ...options.remainingObj };

        // Sắp xếp lại dữ liệu theo obj gốc và in ra giao diện
        const sorted = sortedObj(jsonNew, combiedObjTranslated);
        $('#updateResult').val(JSON.stringify(sorted, null, Number($('#spaceRow').val())));

        // Tạo bảng và gán dữ liệu cho bảng
        const dataTable = createDataTable(jsonNew, sorted);
        $('#tb_update').find('tbody').html(createTable('#tb_update-Template', dataTable));

        // Tự động điều chỉnh chiều cao của tất cả các textarea
        $('#tb_update').find('tbody textarea').each(function () {
            autoResizeTextarea(this);
        });

        $('#btn-update_copy').css('visibility', 'unset'); // Hiển thị nút sao chép
        stopProgressBar('#progressUpdate', 700); // Kết thúc thanh tiến trình, đóng sau 0.7s
        $(this).removeClass("disabled");
    } catch (error) {
        console.log(error);
        stopProgressBar('#progressUpdate', 0);
        showErrorToast("Có lỗi xảy ra trong quá trình dịch");
        $(this).removeClass("disabled");
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
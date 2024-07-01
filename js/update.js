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


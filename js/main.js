function convertPlaceHbs(template, options = { from: { start: "%", end: "%" }, to: { start: "{{", end: "}}" } }) {
    try {
        const { from, to } = options;
        const startRegex = new RegExp(from.start.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '([^]*?)' + from.end.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'g');
        // Tìm các cặp mở và đóng trong template

        return template.replace(startRegex, function (match, p1) {
            // Thực hiện thay thế trong từng cặp
            return to.start + p1.replace(new RegExp(to.start.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'g'), from.start)
                .replace(new RegExp(to.end.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'g'), from.end) + to.end;
        });
    } catch (e) {
        // console.log(e);
    }
}

$('#page-translate').click(function () {
    localStorage.setItem("page", "translate");
    fetch('views/translate.hbs')
        .then(response => response.text())
        .then(template => {
            const compiledTemplate = Handlebars.compile(template);
            $('#page-content').html(compiledTemplate());
        });
});

$('#page-update').click(function () {
    localStorage.setItem("page", "update");
    fetch('views/update.hbs')
        .then(response => response.text())
        .then(template => {
            const compiledTemplate = Handlebars.compile(template);
            $('#page-content').html(compiledTemplate());
        });
});

const currentPage = localStorage.getItem("page");
if (currentPage == "update") $('#page-update').click();
else if (currentPage == "translate") $('#page-translate').click();


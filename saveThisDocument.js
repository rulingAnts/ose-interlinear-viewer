const thisFileName = 'Exported OneStory Story - ' + Date();
function downloadHtml() {
    // Get the HTML content
    var htmlContent = document.documentElement.outerHTML;

    // Create a Blob (Binary Large Object) with the HTML content
    var blob = new Blob([htmlContent], { type: 'text/html' });

    // Create a link element
    var a = document.createElement('a');

    // Set the href attribute of the link to the Blob object
    a.href = URL.createObjectURL(blob);

    // Set the download attribute to specify the filename
    a.download = thisFileName + '.html';

    // Append the link to the document body
    document.body.appendChild(a);

    // Programmatically trigger a click event on the link
    a.click();

    // Remove the link from the document body
    document.body.removeChild(a);
}
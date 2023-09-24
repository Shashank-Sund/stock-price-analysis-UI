document.addEventListener('DOMContentLoaded', function() {
    const apiButton = document.getElementById('apiButton');
    const responseDiv = document.getElementById('response');

    apiButton.addEventListener('click', function() {

        // Diable button and change text while process is running
        apiButton.disabled = true;
        apiButton.textContent = "Running...";

        // API URL
        const apiUrl = 'https://mgpqvaaqhh.execute-api.us-east-1.amazonaws.com/Prod';

        // Get data from input fields
        const input1Value = document.getElementById('input1').value;
        const input2Value = document.getElementById('input2').value;
        const input3Value = document.getElementById('input3').value;

        // Request data from inout fields
        const requestData = {
            start_date: input1Value,
            end_date: input2Value,
            symbol: input3Value
        };

        // Sends POST request to the API
        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
        .then(response => response.text()) // stringify's output
        .then(html => {
            // Extract just the body tag content to format out status code and header information
            const bodyContent = /<body[^>]*>[\s\S]*?([\s\S]*)<\/body>/i.exec(html)[1];
            
            const responseDiv = document.getElementById('response');
            responseDiv.innerHTML = bodyContent; // Set the HTML body content
          })
        .catch(error => {
            console.error('Error:', error);
            responseDiv.textContent = 'An error occurred while sending the request.';
        });

        setTimeout(function () {
            // Re-enable the button and restore the original text
            apiButton.disabled = false;
            apiButton.textContent = "Analyze";
        }, 5000);
    });
});

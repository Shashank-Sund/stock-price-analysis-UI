document.addEventListener('DOMContentLoaded', function() {
    const apiButton = document.getElementById('apiButton');
    const responseDiv = document.getElementById('response');

    apiButton.addEventListener('click', function() {
        // Define the API URL
        const apiUrl = 'https://mgpqvaaqhh.execute-api.us-east-1.amazonaws.com/Prod'; // Replace with your API endpoint

        // Get data from input fields
        const input1Value = document.getElementById('input1').value;
        const input2Value = document.getElementById('input2').value;
        const input3Value = document.getElementById('input3').value;

        // Define the request data
        const requestData = {
            start_date: input1Value,
            end_date: input2Value,
            symbol: input3Value
        };

        // Send a POST request to the API
        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
        .then(response => response.text()) // Change to .json() if the API response is JSON
        .then(data => {
            // Display the API response as HTML
            responseDiv.innerHTML = data;
        })
        .catch(error => {
            console.error('Error:', error);
            responseDiv.textContent = 'An error occurred while sending the request.';
        });
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const fileListContainer = document.getElementById('fileListContainer');
    const fileList = document.getElementById('fileList');
    const fileCount = document.getElementById('fileCount');
    const resultContainer = document.getElementById('resultContainer');
    const resultsContainer = document.getElementById('resultsContainer');
    const fileUploadLabel = document.querySelector('.file-upload-label');

    fileUploadLabel.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadLabel.style.backgroundColor = 'rgba(67, 97, 238, 0.1)';
        fileUploadLabel.style.borderColor = 'var(--primary)';
    });

    fileUploadLabel.addEventListener('dragleave', () => {
        fileUploadLabel.style.backgroundColor = '';
        fileUploadLabel.style.borderColor = '';
    });

    fileUploadLabel.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadLabel.style.backgroundColor = '';
        fileUploadLabel.style.borderColor = '';

        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            updateFileNameDisplay();
        }
    });

    fileInput.addEventListener('change', updateFileNameDisplay);

    function updateFileNameDisplay() {
        if (fileInput.files.length > 0) {
            fileListContainer.style.display = 'block';
            fileList.innerHTML = '';
            fileCount.textContent = `${fileInput.files.length} file${fileInput.files.length > 1 ? 's' : ''}`;

            const filesArray = Array.from(fileInput.files);
            filesArray.forEach((file, index) => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';

                const fileName = document.createElement('div');
                fileName.className = 'file-name';
                fileName.innerHTML = `<i class="fas fa-file-alt"></i><span>${file.name}</span>`;

                const fileStatus = document.createElement('div');
                fileStatus.className = 'file-status status-waiting';
                fileStatus.textContent = 'Waiting';
                fileStatus.id = `status-${file.name.replace(/[^a-z0-9]/gi, '_')}`;

                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-file-btn';
                removeBtn.innerHTML = '&times;';
                removeBtn.title = 'Remove file';
                removeBtn.onclick = function () {
                    removeFile(index);
                };

                fileItem.appendChild(fileName);
                fileItem.appendChild(fileStatus);
                fileItem.appendChild(removeBtn);
                fileList.appendChild(fileItem);
            });

            document.querySelector('.file-upload-text').textContent = `${fileInput.files.length} file${fileInput.files.length > 1 ? 's' : ''} selected`;
            document.querySelector('.file-upload-hint').textContent = 'Click to change files';
        } else {
            fileListContainer.style.display = 'none';
            document.querySelector('.file-upload-text').textContent = 'Choose files or drag them here';
            document.querySelector('.file-upload-hint').textContent = 'Click to browse your files';
        }
    }

    function removeFile(index) {
        const dt = new DataTransfer();
        const files = Array.from(fileInput.files);

        files.splice(index, 1);

        files.forEach(file => {
            dt.items.add(file);
        });

        fileInput.files = dt.files;
        updateFileNameDisplay();
    }

    uploadBtn.addEventListener('click', async function () {
        const files = fileInput.files;

        if (!files || files.length === 0) {
            showError('Please select at least one file');
            return;
        }

        // Validate all files
        let validFiles = true;
        Array.from(files).forEach(file => {
            if (!file.name.match(/\.(pdf|docx)$/i)) {
                showError(`Invalid file type: ${file.name}`);
                validFiles = false;
            }

            if (file.size > 10 * 1024 * 1024) {
                showError(`File too large: ${file.name}`);
                validFiles = false;
            }
        });

        if (!validFiles) return;

        hideError();
        resultContainer.style.display = 'none';
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Processing...</span>';
        loadingIndicator.style.display = 'flex';

        try {
            const formData = new FormData();
            Array.from(files).forEach(file => {
                formData.append('file', file);
                const statusId = `status-${file.name.replace(/[^a-z0-9]/gi, '_')}`;
                document.getElementById(statusId).className = 'file-status status-processing';
                document.getElementById(statusId).textContent = 'Processing';
            });

            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Server responded with an error');
            }

            const data = await response.json();

            // Clear previous results
            resultsContainer.innerHTML = '';

            // Process each result
            if (data.results && data.results.length > 0) {
                data.results.forEach(result => {
                    const statusId = `status-${result.filename.replace(/[^a-z0-9]/gi, '_')}`;
                    const statusElement = document.getElementById(statusId);

                    if (result.error) {
                        if (statusElement) {
                            statusElement.className = 'file-status status-error';
                            statusElement.textContent = 'Error';
                        }
                        return;
                    }

                    if (statusElement) {
                        statusElement.className = 'file-status status-success';
                        statusElement.textContent = 'Done';
                    }

                    const resultItem = document.createElement('div');
                    resultItem.className = 'result-item';

                    const reduction = Math.round(((result.original_length - result.summary_length) / result.original_length) * 100);

                    resultItem.innerHTML = `
                        <div class="result-item-header">
                            <div class="result-item-title">${result.filename}</div>
                        </div>
                        <div class="summary-text">${result.summary}</div>
                        <div class="stats">
                            <div class="stat-item">
                                <i class="fas fa-file-alt"></i>
                                <span>Original: <span class="stat-value">${result.original_length}</span> chars</span>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-compress-alt"></i>
                                <span>Summary: <span class="stat-value">${result.summary_length}</span> chars</span>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-percentage"></i>
                                <span>Reduction: <span class="stat-value">${reduction}</span>%</span>
                            </div>
                        </div>
                        <div class="actions">
                            <button class="action-btn copy-btn tooltip" onclick="copySummary(this, '${escapeHtml(result.summary)}')">
                                <i class="far fa-copy"></i>
                                <span>Copy Summary</span>
                                <span class="tooltip-text">Copy to clipboard</span>
                            </button>
                            <a href="${result.download_txt}" class="action-btn download-txt-btn" download="${result.filename.split('.')[0]}_summary.txt">
                                <i class="fas fa-file-download"></i>
                                <span>Download TXT</span>
                            </a>
                            <a href="${result.download_docx}" class="action-btn download-docx-btn" download="${result.filename.split('.')[0]}_summary.docx">
                                <i class="fas fa-file-word"></i>
                                <span>Download DOCX</span>
                            </a>
                        </div>
                    `;

                    resultsContainer.appendChild(resultItem);
                });

                resultContainer.style.display = 'block';
            }

            if (data.error) {
                showError(data.error);
            } else if (data.results && data.results.every(result => result.error)) {
                showError('All files failed to process. Please check the file formats and try again.');
            }

        } catch (error) {
            showError('Failed to process documents. Please try again.');
            console.error('Error:', error);
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-magic"></i><span>Generate Summaries</span>';
            loadingIndicator.style.display = 'none';
        }
    });

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML.replace(/'/g, "\\'");
    }

    window.copySummary = function (button, text) {
        const unescapedText = text.replace(/\\'/g, "'");
        navigator.clipboard.writeText(unescapedText).then(() => {
            const originalContent = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i><span>Copied!</span>';
            setTimeout(() => {
                button.innerHTML = originalContent;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            showError('Failed to copy text to clipboard');
        });
    };

    function showError(message) {
        errorText.textContent = message;
        errorMessage.style.display = 'block';
    }

    function hideError() {
        errorMessage.style.display = 'none';
    }
});

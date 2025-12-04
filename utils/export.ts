export function downloadCSV(data: any[], filename: string) {
    if (!data || data.length === 0) {
        alert('Tidak ada data untuk diexport')
        return
    }

    // Extract headers from the first object
    const headers = Object.keys(data[0])

    // Convert data to CSV format
    const csvContent = [
        headers.join(','), // Header row
        ...data.map(row => headers.map(fieldName => {
            // Handle values that might contain commas or newlines
            let value = row[fieldName]
            if (value === null || value === undefined) value = ''
            value = value.toString().replace(/"/g, '""') // Escape quotes
            if (value.search(/("|,|\n)/g) >= 0) value = `"${value}"` // Quote if needed
            return value
        }).join(','))
    ].join('\n')

    // Create blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

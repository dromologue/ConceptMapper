use std::fmt;

/// A parse error with location and suggestion for fixing.
#[derive(Debug, Clone)]
pub struct ParseError {
    pub line: usize,
    pub context: String,
    pub message: String,
    pub suggestion: Option<String>,
}

impl fmt::Display for ParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "error[line {}]: {}", self.line, self.message)?;
        if let Some(ref suggestion) = self.suggestion {
            write!(f, ". Suggestion: {}", suggestion)?;
        }
        Ok(())
    }
}

/// A non-fatal warning.
#[derive(Debug, Clone)]
pub struct ParseWarning {
    pub line: usize,
    pub message: String,
}

impl fmt::Display for ParseWarning {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "warning[line {}]: {}", self.line, self.message)
    }
}

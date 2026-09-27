using Gagebu_Server.Servecies;
using GagebuShared;
using Microsoft.AspNetCore.Mvc;

namespace Gagebu_Server.Controllers
{
    [ApiController]
    public abstract class ApiControllerBase : ControllerBase
    {
        // 서비스 실패 → HTTP 응답. 분기는 ErrorType으로만 한다 (메시지 문자열 비교 금지)
        protected IActionResult ErrorResponse<T>(ServiceResult<T> result)
        {
            HttpContext.RequestServices.GetRequiredService<ILogger<ApiControllerBase>>()
                .LogWarning("Request failed ({ErrorType}): {ErrorMessage}", result.ErrorType, result.ErrorMessage);

            return result.ErrorType switch
            {
                eErrorType.Validation => BadRequest(result.ErrorMessage),
                eErrorType.NotFound => NotFound(result.ErrorMessage),
                eErrorType.Conflict => Conflict(result.ErrorMessage),
                eErrorType.Forbidden => StatusCode(StatusCodes.Status403Forbidden, result.ErrorMessage),
                eErrorType.Gone => StatusCode(StatusCodes.Status410Gone, result.ErrorMessage),
                eErrorType.Unauthorized => Unauthorized(result.ErrorMessage),
                eErrorType.Unavailable => StatusCode(StatusCodes.Status503ServiceUnavailable, result.ErrorMessage),
                _ => StatusCode(StatusCodes.Status500InternalServerError, result.ErrorMessage)
            };
        }

        protected IActionResult OkOrError<T>(ServiceResult<T> result) =>
            result.IsSuccess ? Ok(result.Data) : ErrorResponse(result);
    }
}

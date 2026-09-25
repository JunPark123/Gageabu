using GagebuShared;

namespace Gagebu_Server.Servecies
{
    // 서비스 결과. 실패 시 컨트롤러는 ErrorType으로 HTTP 상태를 정한다
    public class ServiceResult<T>
    {
        public bool IsSuccess { get; private set; }
        public T? Data { get; private set; }
        public string? ErrorMessage { get; private set; }
        public eErrorType ErrorType { get; private set; }

        private ServiceResult(bool isSuccess, T? data, string? errorMessage, eErrorType errorType = eErrorType.ServerError)
        {
            IsSuccess = isSuccess;
            Data = data;
            ErrorMessage = errorMessage;
            ErrorType = errorType;
        }

        public static ServiceResult<T> Success(T data)
            => new ServiceResult<T>(true, data, null);

        public static ServiceResult<T> Failure(string errorMessage, eErrorType errorType = eErrorType.ServerError)
            => new ServiceResult<T>(false, default, errorMessage, errorType);

        public static ServiceResult<T> NotFound(string errorMessage)
            => new ServiceResult<T>(false, default, errorMessage, eErrorType.NotFound);

        public static ServiceResult<T> ValidationError(string errorMessage)
            => new ServiceResult<T>(false, default, errorMessage, eErrorType.Validation);
    }

}

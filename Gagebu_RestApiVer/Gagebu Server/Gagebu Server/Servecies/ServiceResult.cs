using DevExpress.Xpo;
using System;
using GagebuShared;

namespace Gagebu_Server.Servecies
{
    public class ServiceResult<T>
    {
        public bool IsSuccess { get; private set; }
        public T Data { get; private set; }
        public string ErrorMessage { get; private set; }
        public ErrorType ErrorType { get; private set; }

        private ServiceResult(bool isSuccess, T data, string errorMessage, ErrorType errorType = ErrorType.ServerError)
        {
            IsSuccess = isSuccess;
            Data = data;
            ErrorMessage = errorMessage;
            ErrorType = errorType;
        }

        public static ServiceResult<T> Success(T data)
            => new ServiceResult<T>(true, data, null);

        public static ServiceResult<T> Failure(string errorMessage, ErrorType errorType = ErrorType.ServerError)
            => new ServiceResult<T>(false, default(T), errorMessage, errorType);

        public static ServiceResult<T> NotFound(string errorMessage)
            => new ServiceResult<T>(false, default(T), errorMessage, ErrorType.NotFound);

        public static ServiceResult<T> ValidationError(string errorMessage)
            => new ServiceResult<T>(false, default(T), errorMessage, ErrorType.Validation);
    }

}